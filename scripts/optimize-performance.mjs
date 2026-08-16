import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fontLinks = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
`;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (entry.name.endsWith(".html")) files.push(absolute);
  }
  return files;
}

for (const file of await walk(root)) {
  let html = await readFile(file, "utf8");
  html = html
    .replaceAll("https://www.nvooman.com", "https://nvooman.com")
    .replaceAll("موسوعة كيراتوبيديا", "موسوعة القرنية المخروطية")
    .replaceAll("كيراتوبيديا", "موسوعة القرنية المخروطية")
    .replace(' يمكن مراجعة <a href="scleral-lenses-al-buraimi">دليل العدسات السكليرال في البريمي</a> قبل الحجز.', "")
    .replace(
      '<a href="branches">الفروع</a><a href="https://www.nvoshop.com"',
      '<a href="branches">الفروع</a><a href="keratopedia">موسوعة القرنية المخروطية</a><a href="https://www.nvoshop.com"',
    )
    .replace(
      '<a href="branches">الفروع والتواصل</a><a href="https://www.nvoshop.com"',
      '<a href="branches">الفروع والتواصل</a><a href="keratopedia">موسوعة القرنية المخروطية</a><a href="https://www.nvoshop.com"',
    )
    .replace(/<link rel="preload" href="\/assets\/fonts\/cairo-(?:arabic|latin)\.woff2"[^>]*>\r?\n?/g, "")
    .replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\r?\n?/g, "")
    .replace(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\r?\n?/g, "")
    .replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Cairo:[^"]+" rel="stylesheet">\r?\n?/g, "")
    .replace(/<img\b(?![^>]*\bdecoding=)([^>]*)>/g, '<img decoding="async"$1>')
    .replace(/document\.getElementById\("bookForm"\)\.addEventListener/g, 'document.getElementById("bookForm")?.addEventListener');

  if (!html.includes("fonts.googleapis.com/css2?family=Cairo")) {
    html = html.replace(/(<link rel="stylesheet"[^>]*>)/, `${fontLinks}$1`);
  }

  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  if (relative === "index.html" || relative === "en/index.html") {
    html = html.replace(
      /<img decoding="async" class="hero-logo"(?: loading="eager" fetchpriority="high")*/,
      '<img decoding="async" class="hero-logo" loading="eager" fetchpriority="high"',
    );
  }
  if (relative === "index.html" && !html.includes('id="keratopedia-feature"')) {
    html = html.replace(
      '<section class="section"><div class="container shop-banner">',
      '<section class="section-sm" id="keratopedia-feature"><div class="container cta"><div><span class="eyebrow light">موسوعة القرنية المخروطية</span><h2>موسوعة عربية متخصصة لصحة القرنية والعدسات</h2><p>مقالات موثوقة ومراجعة عن القرنية المخروطية، العدسات السكليرال، تثبيت القرنية، وفهم خيارات تصحيح الرؤية.</p></div><a class="btn btn-white" href="keratopedia">زيارة موسوعة القرنية المخروطية</a></div></section><section class="section"><div class="container shop-banner">',
    );
  }
  await writeFile(file, html);
}

for (const relative of ["styles.css", "assets/keratopedia/keratopedia.css"]) {
  const file = path.join(root, relative);
  let css = await readFile(file, "utf8");
  css = css.replace(/^@font-face\{font-family:"Cairo"[\s\S]*?U\+FFFD\}/, "");
  if (relative === "styles.css" && !css.includes("/* lighthouse-layout */")) {
    css += "\n/* lighthouse-layout */.hero-logo,.footer-logo img{height:auto;aspect-ratio:60/51;object-fit:contain}.whatsapp-fab{contain:layout paint}.section,.section-sm,.site-footer{content-visibility:auto;contain-intrinsic-size:auto 800px}\n";
  }
  await writeFile(file, css);
}

for (const relative of ["sitemap.xml", "robots.txt"]) {
  const file = path.join(root, relative);
  const content = await readFile(file, "utf8");
  await writeFile(file, content.replaceAll("https://www.nvooman.com", "https://nvooman.com"));
}

console.log("Applied deterministic performance markup to all HTML pages.");
