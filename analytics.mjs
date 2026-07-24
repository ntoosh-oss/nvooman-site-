import {
  NVO_EVENT_NAMES,
  classifyClick,
  pageViewEvents,
  preserveAttribution,
  readUtmParameters,
  sanitizeAnalyticsParams,
} from "/analytics-core.mjs";

const CONSENT_KEY = "nvo_analytics_consent";
const ATTRIBUTION_KEY = "nvo_campaign_attribution";

function sendEvent(name, parameters = {}) {
  if (!NVO_EVENT_NAMES.includes(name) || typeof window.gtag !== "function") return;
  const attribution = getAttribution();
  window.gtag("event", name, sanitizeAnalyticsParams({
    page_path: window.location.pathname,
    page_title: document.title,
    ...attribution,
    ...parameters,
  }));
}

function getAttribution() {
  let stored = {};
  try {
    stored = JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_KEY) || "{}");
  } catch {
    stored = {};
  }
  const attribution = preserveAttribution(stored, readUtmParameters(window.location.search));
  try {
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // Attribution remains available for this page when browser storage is unavailable.
  }
  return attribution;
}

function installInteractionTracking() {
  if (window.__nvoAnalyticsInteractionsInstalled) return;
  window.__nvoAnalyticsInteractionsInstalled = true;

  document.addEventListener("click", (event) => {
    if (!event.isTrusted) return;
    const target = event.target instanceof Element ? event.target.closest("a,button") : null;
    if (!target) return;
    const href = target instanceof HTMLAnchorElement ? target.href : "";
    const parameters = {
      link_url: href,
      link_text: target.textContent || target.getAttribute("aria-label") || "",
      branch_name: target.getAttribute("data-branch-name") || "",
    };
    const events = classifyClick({
      href,
      text: target.textContent || target.getAttribute("aria-label") || "",
      download: target instanceof HTMLAnchorElement && target.hasAttribute("download"),
      origin: window.location.origin,
      explicitEvent: target.getAttribute("data-analytics-event") || "",
    });
    for (const name of events) sendEvent(name, parameters);
  }, { capture: true });

  document.addEventListener("submit", (event) => {
    if (!event.isTrusted || !(event.target instanceof HTMLFormElement)) return;
    sendEvent("form_submit", {
      form_name: event.target.getAttribute("data-form-name") ||
        event.target.getAttribute("name") ||
        event.target.id ||
        "website_form",
    });
  }, { capture: true });

  document.addEventListener("change", (event) => {
    if (
      !event.isTrusted ||
      !(event.target instanceof HTMLInputElement) ||
      event.target.type !== "file" ||
      !event.target.matches("[data-report-upload]")
    ) return;
    sendEvent("report_upload", {
      form_name: event.target.closest("form")?.getAttribute("data-form-name") || "report_upload",
    });
  }, { capture: true });

  document.querySelectorAll("video").forEach((video) => {
    if (video.dataset.nvoAnalyticsBound === "true") return;
    video.dataset.nvoAnalyticsBound = "true";
    video.addEventListener("play", (event) => {
      if (event.isTrusted) sendEvent("video_start", { content_title: video.title || "" });
    }, { once: true });
    video.addEventListener("ended", (event) => {
      if (event.isTrusted) sendEvent("video_complete", { content_title: video.title || "" });
    }, { once: true });
  });
}

function installGoogleTag(measurementId) {
  if (window.__nvoGoogleTagInstalled) return;
  window.__nvoGoogleTagInstalled = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("consent", "default", { analytics_storage: "granted" });
  window.gtag("config", measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_flags: "SameSite=Lax;Secure",
    send_page_view: true,
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.append(script);
  getAttribution();
  installInteractionTracking();
  for (const name of pageViewEvents(window.location.pathname)) {
    sendEvent(name, {
      content_category: name.replace(/_page_view$/, ""),
      content_title: document.title,
    });
  }
}

function consentBanner(measurementId) {
  if (document.querySelector("[data-nvo-consent-banner]")) return;
  const arabic = document.documentElement.lang.toLocaleLowerCase().startsWith("ar");
  const banner = document.createElement("aside");
  banner.dataset.nvoConsentBanner = "true";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", arabic ? "إعدادات التحليلات" : "Analytics settings");
  banner.style.cssText = "position:fixed;z-index:9999;inset:auto 16px 16px 16px;max-width:680px;margin:auto;padding:16px;border:1px solid #cbd8d5;border-radius:12px;background:#fff;color:#173d38;box-shadow:0 12px 45px rgba(0,0,0,.18);font:14px/1.65 Cairo,Tahoma,Arial,sans-serif";
  const message = document.createElement("p");
  message.style.margin = "0 0 12px";
  message.textContent = arabic
    ? "نستخدم Google Analytics بعد موافقتك لقياس أداء الموقع والتفاعلات التسويقية. لا نرسل أسماء أو أرقام هواتف أو رسائل أو بيانات طبية."
    : "With your permission, Google Analytics measures website performance and marketing interactions. We do not send names, phone numbers, messages, or medical information.";
  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap";
  const accept = document.createElement("button");
  accept.type = "button";
  accept.textContent = arabic ? "موافق" : "Allow analytics";
  accept.style.cssText = "border:0;border-radius:7px;padding:9px 14px;background:#166a78;color:#fff;font:inherit;font-weight:700;cursor:pointer";
  const reject = document.createElement("button");
  reject.type = "button";
  reject.textContent = arabic ? "رفض" : "Decline";
  reject.style.cssText = "border:1px solid #cbd8d5;border-radius:7px;padding:9px 14px;background:#fff;color:#173d38;font:inherit;font-weight:700;cursor:pointer";
  accept.addEventListener("click", () => {
    window.localStorage.setItem(CONSENT_KEY, "granted");
    banner.remove();
    installGoogleTag(measurementId);
  }, { once: true });
  reject.addEventListener("click", () => {
    window.localStorage.setItem(CONSENT_KEY, "denied");
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", { analytics_storage: "denied" });
    }
    banner.remove();
    if (window.__nvoGoogleTagInstalled) window.location.reload();
  }, { once: true });
  actions.append(accept, reject);
  banner.append(message, actions);
  document.body.append(banner);
}

function consentSettingsButton(measurementId) {
  if (document.querySelector("[data-nvo-consent-settings]")) return;
  const arabic = document.documentElement.lang.toLocaleLowerCase().startsWith("ar");
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.nvoConsentSettings = "true";
  button.textContent = arabic ? "إعدادات التحليلات" : "Analytics settings";
  button.style.cssText = "position:fixed;z-index:9998;inset:auto auto 8px 8px;border:1px solid #cbd8d5;border-radius:6px;padding:5px 8px;background:#fff;color:#45625d;font:11px Cairo,Tahoma,Arial,sans-serif;cursor:pointer";
  button.addEventListener("click", () => consentBanner(measurementId));
  document.body.append(button);
}

async function start() {
  if (window.__nvoAnalyticsStarted) return;
  window.__nvoAnalyticsStarted = true;
  const response = await fetch("/api/analytics-config", {
    credentials: "same-origin",
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return;
  const config = await response.json().catch(() => ({}));
  if (!/^G-[A-Z0-9]+$/.test(config.measurementId || "")) return;
  consentSettingsButton(config.measurementId);
  const consent = window.localStorage.getItem(CONSENT_KEY);
  if (consent === "granted") {
    installGoogleTag(config.measurementId);
  } else if (consent !== "denied") {
    consentBanner(config.measurementId);
  }
}

start();
