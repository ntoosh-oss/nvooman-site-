import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteOrigin = "https://nvooman.com";

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }

  return files;
}

function routeForFile(file) {
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) {
    return `/${relative.slice(0, -"/index.html".length)}`;
  }
  return `/${relative.replace(/\.html$/, "")}`;
}

function routeCandidates(route) {
  const clean = decodeURIComponent(route.split(/[?#]/, 1)[0]);
  if (clean === "/") return [path.join(root, "index.html")];

  const relative = clean.replace(/^\/+|\/+$/g, "");
  return [
    path.join(root, `${relative}.html`),
    path.join(root, relative, "index.html"),
  ];
}

async function routeExists(route) {
  for (const candidate of routeCandidates(route)) {
    try {
      await access(candidate);
      return true;
    } catch {
      // Try the next clean-URL mapping.
    }
  }
  return false;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map(
    (match) => match[0],
  );
}

function attribute(tag, name) {
  return new RegExp(`\\b${name}=["']([^"']*)["']`, "i").exec(tag)?.[1];
}

function elementText(html, name) {
  return new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i").exec(
    html,
  )?.[1].trim();
}

function jsonLdTypes(documents) {
  const types = new Set();
  const queue = [...documents];

  while (queue.length) {
    const value = queue.pop();
    if (Array.isArray(value)) {
      queue.push(...value);
    } else if (value && typeof value === "object") {
      const type = value["@type"];
      if (type) {
        for (const item of Array.isArray(type) ? type : [type]) types.add(item);
      }
      queue.push(...Object.values(value));
    }
  }

  return types;
}

const allFiles = await walk(root);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
const robots = await readFile(path.join(root, "robots.txt"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (match) => match[1],
);
const bilingualPairs = [
  ["/", "/en"],
  ["/keratoconus", "/en/keratoconus"],
  ["/scleral-lenses", "/en/scleral-lenses"],
  ["/specialty-lenses", "/en/specialty-lenses"],
  ["/corneal-topography", "/en/corneal-topography"],
  ["/ocular-prosthetics", "/en/ocular-prosthetics"],
  ["/lens-solutions", "/en/lens-solutions"],
  ["/branches", "/en/branches"],
  ["/privacy", "/en/privacy"],
];
const keratopediaRoutes = [
  "/keratopedia",
  "/keratopedia/lasik-keratoconus",
  "/keratopedia/eye-rubbing",
  "/keratopedia/cost",
  "/keratopedia/symptoms",
  "/keratopedia/diagnosis",
  "/keratopedia/cross-linking",
  "/keratopedia/scleral-lenses",
  "/keratopedia/scleral-vs-rgp",
  "/keratopedia/children",
  "/keratopedia/corneal-transplant",
];
const expectedSitemapUrls = [
  ...bilingualPairs.flat(),
  ...keratopediaRoutes,
].map((route) => new URL(route, `${siteOrigin}/`).href);

assert.ok(sitemapUrls.length > 0, "Sitemap must contain URLs");
assert.match(
  robots,
  /^Sitemap: https:\/\/nvooman\.com\/sitemap\.xml$/m,
  "robots.txt must advertise the canonical sitemap URL",
);
assert.equal(
  new Set(sitemapUrls).size,
  sitemapUrls.length,
  "Sitemap must not contain duplicate URLs",
);
assert.deepEqual(
  [...sitemapUrls].sort(),
  [...expectedSitemapUrls].sort(),
  "Sitemap must contain exactly the approved 29 canonical URLs",
);
assert.ok(
  !sitemap.includes("/en/keratopedia"),
  "Sitemap must not advertise the unavailable English Keratopedia page",
);

for (const sitemapUrl of sitemapUrls) {
  const url = new URL(sitemapUrl);
  assert.equal(url.origin, siteOrigin, `Unexpected sitemap origin: ${sitemapUrl}`);
  assert.ok(
    await routeExists(url.pathname),
    `Sitemap URL has no matching file: ${sitemapUrl}`,
  );
}

let internalLinksChecked = 0;
let imagesChecked = 0;
const indexableTitles = new Map();
const indexableDescriptions = new Map();
const indexableCanonicals = new Map();
const priorityRoutes = new Set([
  "/keratoconus",
  "/en/keratoconus",
  "/scleral-lenses",
  "/en/scleral-lenses",
  "/corneal-topography",
  "/en/corneal-topography",
]);
const branchPhones = [
  "+96898268820",
  "+96871576116",
  "+96892625617",
  "+96891423440",
  "+96897077422",
  "+96899444811",
  "+96896745471",
  "+96891969852",
];

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const relative = path.relative(root, file);
  const route = routeForFile(file);
  const baseUrl = new URL(route, `${siteOrigin}/`);

  assert.equal(
    (html.match(/<h1\b/gi) ?? []).length,
    1,
    `${relative} must contain exactly one H1`,
  );
  assert.equal(
    (html.match(/<link\b[^>]*rel=["']canonical["']/gi) ?? []).length,
    1,
    `${relative} must contain exactly one canonical link`,
  );

  const canonicalTag = tags(html, "link").find(
    (link) => attribute(link, "rel")?.toLowerCase() === "canonical",
  );
  const canonical = attribute(canonicalTag, "href");
  const isErrorPage = path.basename(file) === "404.html";

  if (!isErrorPage) {
    const expectedCanonical = new URL(route, `${siteOrigin}/`).href;
    assert.equal(
      canonical,
      expectedCanonical,
      `${relative} canonical must match its clean production URL`,
    );
  }

  if (sitemapUrls.includes(canonical)) {
    const title = elementText(html, "title");
    const descriptionTag = tags(html, "meta").find(
      (meta) => attribute(meta, "name")?.toLowerCase() === "description",
    );
    const description = attribute(descriptionTag, "content");

    assert.ok(title, `${relative} is missing a title`);
    assert.ok(description, `${relative} is missing a meta description`);
    assert.ok(
      !indexableTitles.has(title),
      `${relative} duplicates the title used by ${indexableTitles.get(title)}`,
    );
    assert.ok(
      !indexableDescriptions.has(description),
      `${relative} duplicates the description used by ${indexableDescriptions.get(description)}`,
    );
    assert.ok(
      !indexableCanonicals.has(canonical),
      `${relative} duplicates the canonical used by ${indexableCanonicals.get(canonical)}`,
    );
    indexableTitles.set(title, relative);
    indexableDescriptions.set(description, relative);
    indexableCanonicals.set(canonical, relative);
  }

  const languagePair = bilingualPairs.find((pair) => pair.includes(route));
  if (languagePair) {
    const [arabicRoute, englishRoute] = languagePair;
    const expectedAlternates = new Map([
      ["ar-OM", new URL(arabicRoute, `${siteOrigin}/`).href],
      ["en-OM", new URL(englishRoute, `${siteOrigin}/`).href],
      ["x-default", new URL(arabicRoute, `${siteOrigin}/`).href],
    ]);
    const alternateTags = tags(html, "link").filter(
      (link) => attribute(link, "rel")?.toLowerCase() === "alternate",
    );

    for (const [language, href] of expectedAlternates) {
      const matches = alternateTags.filter(
        (link) => attribute(link, "hreflang") === language,
      );
      assert.equal(
        matches.length,
        1,
        `${relative} must contain exactly one ${language} alternate`,
      );
      assert.equal(
        attribute(matches[0], "href"),
        href,
        `${relative} has an incorrect ${language} alternate`,
      );
    }
  }

  assert.doesNotMatch(
    html,
    /godaddysites\.com|powered by godaddy|websites \+ marketing/i,
    `${relative} still contains legacy GoDaddy branding`,
  );

  if (["branches.html", path.join("en", "branches.html")].includes(relative)) {
    assert.equal(
      (html.match(/\bclass=["']branch-card["']/gi) ?? []).length,
      8,
      `${relative} must list all eight verified branches`,
    );
    assert.equal(
      (html.match(/"@type":\["Optician","LocalBusiness"\]/g) ?? []).length,
      8,
      `${relative} must include structured data for all eight branches`,
    );
    for (const phone of branchPhones) {
      assert.match(
        html,
        new RegExp(`href=["']tel:${phone.replace("+", "\\+")}["']`),
        `${relative} is missing the verified branch phone ${phone}`,
      );
    }
    assert.doesNotMatch(
      html,
      /Liva Account|Password|MOH staff|nvmsbr\d|vision\.(?:alkhadra|hamasa|saraa|liwa|fizah|dhank|yanqul)/i,
      `${relative} contains private operational data`,
    );
  }

  if (relative.replaceAll(path.sep, "/").startsWith("keratopedia/")) {
    const burger = tags(html, "button").find(
      (button) => attribute(button, "id") === "burger",
    );
    assert.ok(burger, `${relative} is missing its mobile menu button`);
    assert.equal(
      attribute(burger, "aria-expanded"),
      "false",
      `${relative} mobile menu must start collapsed`,
    );
    assert.equal(
      attribute(burger, "aria-controls"),
      "mobileMenu",
      `${relative} mobile menu button must identify its controlled menu`,
    );
    assert.match(
      html,
      /function setMobileMenu\(open\)/,
      `${relative} must synchronize the mobile menu accessibility state`,
    );
  }

  for (const image of tags(html, "img")) {
    imagesChecked += 1;
    assert.notEqual(
      attribute(image, "alt"),
      undefined,
      `${relative} contains an image without alt text`,
    );
    assert.ok(
      attribute(image, "width") && attribute(image, "height"),
      `${relative} contains an image without width and height: ${image}`,
    );
  }

  for (const anchor of tags(html, "a")) {
    if (attribute(anchor, "target") === "_blank") {
      assert.match(
        attribute(anchor, "rel") ?? "",
        /\bnoopener\b/i,
        `${relative} has target="_blank" without rel="noopener"`,
      );
    }

    const href = attribute(anchor, "href");
    if (
      !href ||
      href.startsWith("#") ||
      /^(mailto:|tel:|javascript:)/i.test(href)
    ) {
      continue;
    }

    const target = new URL(href, baseUrl);
    if (target.origin !== siteOrigin) continue;
    internalLinksChecked += 1;
    assert.ok(
      await routeExists(target.pathname),
      `${relative} links to a missing internal route: ${target.pathname}`,
    );
  }

  const jsonLdDocuments = [];
  for (const match of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    let document;
    assert.doesNotThrow(() => {
      document = JSON.parse(match[1]);
    }, `${relative} contains invalid JSON-LD`);
    jsonLdDocuments.push(document);
  }

  if (priorityRoutes.has(route)) {
    const types = jsonLdTypes(jsonLdDocuments);
    for (const requiredType of [
      "BreadcrumbList",
      "MedicalWebPage",
      "Service",
      "FAQPage",
    ]) {
      assert.ok(
        types.has(requiredType),
        `${relative} is missing ${requiredType} structured data`,
      );
    }
  }
}

assert.equal(
  indexableCanonicals.size,
  sitemapUrls.length,
  "Every sitemap URL must have one matching self-canonical HTML page",
);

const vercel = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
assert.equal(vercel.cleanUrls, true, "Vercel clean URLs must remain enabled");
assert.equal(
  vercel.trailingSlash,
  false,
  "The canonical URL policy must remain slashless except for the homepage",
);

const expectedLegacyRedirectSources = [
  "/nvms",
  "/eyezone-blog",
  "/ola/services/driving-license-test",
  "/ola/:path*",
  "/m/:path*",
];
assert.deepEqual(
  vercel.redirects.map((redirect) => redirect.source),
  expectedLegacyRedirectSources,
  "Legacy redirects must be complete and ordered before their wildcards",
);

for (const redirect of vercel.redirects) {
  assert.equal(
    redirect.statusCode,
    301,
    `Legacy redirect must be permanent: ${redirect.source}`,
  );
  assert.equal(
    new URL(redirect.destination).origin,
    siteOrigin,
    `Redirect destination must use the canonical www origin: ${redirect.source}`,
  );
}

const middlewareModule = await import(
  pathToFileURL(path.join(root, "middleware.js")).href
);
assert.deepEqual(
  middlewareModule.config.matcher,
  ["/", "/:legacy", "/f/:path*"],
  "Routing middleware must be scoped to the legacy query, single-segment, and article paths",
);

const middlewareRedirectCases = [
  ["/خدماتنا", "/"],
  ["/أفرعنا", "/branches"],
  ["/العروض-الحصرية", "/scleral-lenses"],
  ["/ركن-المنشورات", "/keratopedia"],
  [
    "/f/مواصفات-عدسات-السكليرال-للقرنية-المخروطية",
    "/scleral-lenses",
  ],
  ["/f/legacy-article", "/keratopedia"],
];

for (const [source, destination] of middlewareRedirectCases) {
  const requestUrl = `${siteOrigin}${encodeURI(source)}?utm_source=legacy`;
  const response = middlewareModule.default(new Request(requestUrl));
  assert.equal(response?.status, 301, `${source} middleware redirect must be 301`);
  assert.equal(
    response.headers.get("location"),
    `${new URL(destination, `${siteOrigin}/`).href}?utm_source=legacy`,
    `${source} middleware redirect has the wrong destination`,
  );
}

const legacyBlogResponse = middlewareModule.default(
  new Request(`${siteOrigin}/?blog=y&utm_source=legacy`),
);
assert.equal(legacyBlogResponse?.status, 301, "Legacy blog query must be 301");
assert.equal(
  legacyBlogResponse.headers.get("location"),
  `${siteOrigin}/keratopedia?utm_source=legacy`,
  "Legacy blog query must be removed while campaign parameters are preserved",
);

assert.equal(
  middlewareModule.default(new Request(`${siteOrigin}/`)),
  undefined,
  "Routing middleware must pass the canonical homepage through unchanged",
);

assert.equal(
  middlewareModule.default(new Request(`${siteOrigin}/keratoconus`)),
  undefined,
  "Routing middleware must pass canonical pages through unchanged",
);

const globalHeaders = vercel.headers.find((entry) => entry.source === "/(.*)");
assert.ok(globalHeaders, "Global security headers are missing");

for (const name of [
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "X-Frame-Options",
  "Strict-Transport-Security",
  "Cross-Origin-Opener-Policy",
  "Cross-Origin-Resource-Policy",
  "Content-Security-Policy",
]) {
  assert.ok(
    globalHeaders.headers.some((header) => header.key === name),
    `Missing security header: ${name}`,
  );
}

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  assert.match(
    html,
    /fonts\.googleapis\.com\/css2\?family=Cairo:wght@400;500;600;700;800;900&display=swap/i,
    `${path.relative(root, file)} must load the approved Cairo weight set`,
  );
}

console.log(
  `Site checks passed: ${htmlFiles.length} HTML files, ${sitemapUrls.length} sitemap URLs, ${internalLinksChecked} internal links, ${imagesChecked} images.`,
);
