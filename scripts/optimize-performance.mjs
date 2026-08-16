import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fontFaces = `@font-face{font-family:"Cairo";font-style:normal;font-weight:400 900;font-display:swap;src:url("/assets/fonts/cairo-arabic.woff2") format("woff2");unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC,U+102E0-102FB,U+10E60-10E7E,U+10EC2-10EC4,U+10EFC-10EFF,U+1EE00-1EE03,U+1EE05-1EE1F,U+1EE21-1EE22,U+1EE24,U+1EE27,U+1EE29-1EE32,U+1EE34-1EE37,U+1EE39,U+1EE3B,U+1EE42,U+1EE47,U+1EE49,U+1EE4B,U+1EE4D-1EE4F,U+1EE51-1EE52,U+1EE54,U+1EE57,U+1EE59,U+1EE5B,U+1EE5D,U+1EE5F,U+1EE61-1EE62,U+1EE64,U+1EE67-1EE6A,U+1EE6C-1EE72,U+1EE74-1EE77,U+1EE79-1EE7C,U+1EE7E,U+1EE80-1EE89,U+1EE8B-1EE9B,U+1EEA1-1EEA3,U+1EEA5-1EEA9,U+1EEAB-1EEBB,U+1EEF0-1EEF1}@font-face{font-family:"Cairo";font-style:normal;font-weight:400 900;font-display:swap;src:url("/assets/fonts/cairo-latin.woff2") format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}`;

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
    .replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\r?\n?/g, "")
    .replace(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\r?\n?/g, "")
    .replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Cairo:[^"]+" rel="stylesheet">/g, "")
    .replace(/<img\b(?![^>]*\bdecoding=)([^>]*)>/g, '<img decoding="async"$1>')
    .replace(/document\.getElementById\("bookForm"\)\.addEventListener/g, 'document.getElementById("bookForm")?.addEventListener');

  if (!html.includes('href="/assets/fonts/cairo-arabic.woff2"')) {
    const preloads = '<link rel="preload" href="/assets/fonts/cairo-arabic.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="preload" href="/assets/fonts/cairo-latin.woff2" as="font" type="font/woff2" crossorigin>\n';
    html = html.replace(/(<link rel="stylesheet"[^>]*>)/, `${preloads}$1`);
  }

  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  if (relative === "index.html" || relative === "en/index.html") {
    html = html.replace(
      /<img decoding="async" class="hero-logo"/,
      '<img decoding="async" class="hero-logo" loading="eager" fetchpriority="high"',
    );
  }
  await writeFile(file, html);
}

for (const relative of ["styles.css", "assets/keratopedia/keratopedia.css"]) {
  const file = path.join(root, relative);
  let css = await readFile(file, "utf8");
  if (!css.includes('src:url("/assets/fonts/cairo-arabic.woff2")')) {
    css = `${fontFaces}${css}`;
  }
  if (relative === "styles.css" && !css.includes("/* lighthouse-layout */")) {
    css += "\n/* lighthouse-layout */.hero-logo,.footer-logo img{height:auto;aspect-ratio:60/51;object-fit:contain}.whatsapp-fab{contain:layout paint}.section,.section-sm,.site-footer{content-visibility:auto;contain-intrinsic-size:auto 800px}\n";
  }
  await writeFile(file, css);
}

console.log("Applied deterministic performance markup to all HTML pages.");
