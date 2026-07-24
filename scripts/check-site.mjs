import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteOrigin = "https://www.nvooman.com";

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

const allFiles = await walk(root);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (match) => match[1],
);

assert.ok(sitemapUrls.length > 0, "Sitemap must contain URLs");
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

  for (const match of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    assert.doesNotThrow(
      () => JSON.parse(match[1]),
      `${relative} contains invalid JSON-LD`,
    );
  }
}

const vercel = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
const globalHeaders = vercel.headers.find((entry) => entry.source === "/(.*)");
assert.ok(globalHeaders, "Global security headers are missing");

for (const name of [
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "X-Frame-Options",
  "Content-Security-Policy",
]) {
  assert.ok(
    globalHeaders.headers.some((header) => header.key === name),
    `Missing security header: ${name}`,
  );
}

console.log(
  `Site checks passed: ${htmlFiles.length} HTML files, ${sitemapUrls.length} sitemap URLs, ${internalLinksChecked} internal links, ${imagesChecked} images.`,
);
