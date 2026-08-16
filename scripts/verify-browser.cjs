const { chromium } = require("playwright");
const path = require("node:path");
const { readFileSync } = require("node:fs");

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("kaspersky-labs.com")) errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("requestfailed", (request) => {
    if (!request.url().includes("kaspersky-labs.com")) errors.push(`request: ${request.url()} (${request.failure()?.errorText})`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`response: ${response.status()} ${response.url()}`);
  });
  await page.addInitScript(() => {
    window.__layoutShifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__layoutShifts.push({
          value: entry.value,
          sources: entry.sources.map((source) => source.node?.className || source.node?.nodeName || "unknown"),
        });
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const result = await page.evaluate(() => ({
    bodyLength: document.body.innerText.trim().length,
    cls: window.__layoutShifts.reduce((sum, entry) => sum + entry.value, 0),
    shifts: window.__layoutShifts,
    font: getComputedStyle(document.body).fontFamily,
    fontStatus: document.fonts.status,
    heroLoaded: document.querySelector(".hero-logo")?.complete,
    overlay: Boolean(document.querySelector("[data-nextjs-dialog],.vite-error-overlay,#webpack-dev-server-client-overlay")),
  }));
  await page.screenshot({ path: path.resolve("..", ".openai", "performance-mobile.png"), fullPage: true });
  const sitemap = readFileSync(path.resolve("sitemap.xml"), "utf8");
  const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  const routeResults = [];
  for (const route of routes) {
    await page.goto(`http://127.0.0.1:4173${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(150);
    routeResults.push(await page.evaluate((pathname) => ({
      pathname,
      content: document.body.innerText.trim().length,
      cls: window.__layoutShifts.reduce((sum, entry) => sum + entry.value, 0),
      overlay: Boolean(document.querySelector("[data-nextjs-dialog],.vite-error-overlay,#webpack-dev-server-client-overlay")),
    }), route));
  }
  const maxRouteCls = Math.max(...routeResults.map((route) => route.cls));
  const failedRoutes = routeResults.filter((route) => !route.content || route.overlay || route.cls >= 0.05);
  console.log(JSON.stringify({ ...result, routesChecked: routes.length, maxRouteCls, failedRoutes, errors }, null, 2));
  await browser.close();
  if (!result.bodyLength || result.overlay || errors.length || result.cls >= 0.05 || failedRoutes.length) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
