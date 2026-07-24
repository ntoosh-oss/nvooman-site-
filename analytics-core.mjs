export const NVO_EVENT_NAMES = Object.freeze([
  "whatsapp_click",
  "appointment_click",
  "phone_click",
  "directions_click",
  "shop_click",
  "instagram_click",
  "report_upload",
  "form_submit",
  "keratopedia_article_view",
  "specialty_lens_page_view",
  "scleral_lens_page_view",
  "ocular_prosthesis_page_view",
  "outbound_click",
  "file_download",
  "video_start",
  "video_complete",
]);

const ALLOWED_PARAMETERS = new Set([
  "page_path",
  "page_title",
  "link_url",
  "link_text",
  "content_category",
  "content_title",
  "branch_name",
  "form_name",
  "campaign_source",
]);

const UTM_KEYS = Object.freeze([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
]);

const DOWNLOAD_EXTENSION = /\.(?:pdf|docx?|xlsx?|csv|zip|jpe?g|png|webp)$/i;
const EMAIL_PATTERN = /(?:mailto:|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
const PHONE_PATTERN = /(?:tel:|\+?\d[\d\s().-]{6,}\d)/i;

function safeText(value, maximumLength = 120) {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/\s+/g, " ").trim().slice(0, maximumLength);
  if (EMAIL_PATTERN.test(normalized) || PHONE_PATTERN.test(normalized)) return "";
  return normalized;
}

export function sanitizeLinkUrl(value, baseUrl = "https://www.nvooman.com/") {
  try {
    const url = new URL(value, baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    const hostname = url.hostname.replace(/^www\./, "").toLocaleLowerCase();
    if (
      hostname === "wa.me" ||
      hostname === "api.whatsapp.com" ||
      hostname.endsWith(".whatsapp.com")
    ) {
      url.pathname = "/";
    }
    return `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}

export function sanitizeAnalyticsParams(input = {}) {
  const output = {};
  for (const [key, rawValue] of Object.entries(input)) {
    if (!ALLOWED_PARAMETERS.has(key) || rawValue == null) continue;
    const value = key === "link_url"
      ? sanitizeLinkUrl(String(rawValue))
      : safeText(String(rawValue));
    if (value) output[key] = value;
  }
  return output;
}

export function readUtmParameters(value) {
  const search = typeof value === "string" ? value : "";
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return Object.fromEntries(
    UTM_KEYS.flatMap((key) => {
      const rawValue = params.get(key);
      const value = safeText(rawValue ?? "", 100);
      return value ? [[key, value]] : [];
    }),
  );
}

export function preserveAttribution(existing = {}, incoming = {}) {
  const output = {};
  for (const key of UTM_KEYS) {
    const current = safeText(existing[key] ?? "", 100);
    const next = safeText(incoming[key] ?? "", 100);
    if (current || next) output[key] = current || next;
  }
  return output;
}

export function classifyClick({
  href = "",
  text = "",
  download = false,
  origin = "https://www.nvooman.com",
  explicitEvent = "",
} = {}) {
  const events = new Set();
  if (NVO_EVENT_NAMES.includes(explicitEvent)) events.add(explicitEvent);
  const lowerText = String(text).toLocaleLowerCase();
  let url;
  try {
    url = new URL(href, `${origin}/`);
  } catch {
    return [...events];
  }

  const hostname = url.hostname.replace(/^www\./, "").toLocaleLowerCase();
  const isWhatsApp = hostname === "wa.me" ||
    hostname === "api.whatsapp.com" ||
    hostname.endsWith(".whatsapp.com");
  if (isWhatsApp) {
    events.add("whatsapp_click");
    if (/(appointment|book|booking|موعد|حجز)/i.test(lowerText)) {
      events.add("appointment_click");
    }
  }
  if (url.protocol === "tel:") events.add("phone_click");
  if (
    hostname === "maps.app.goo.gl" ||
    hostname === "google.com" && url.pathname.startsWith("/maps") ||
    /(direction|location|map|اتجاه|موقع|خريطة)/i.test(lowerText)
  ) {
    events.add("directions_click");
  }
  if (hostname === "nvoshop.com" || hostname.endsWith(".nvoshop.com")) events.add("shop_click");
  if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) events.add("instagram_click");
  if (download || DOWNLOAD_EXTENSION.test(url.pathname)) events.add("file_download");

  let ownHostname = "";
  try {
    ownHostname = new URL(origin).hostname.replace(/^www\./, "").toLocaleLowerCase();
  } catch {
    ownHostname = "nvooman.com";
  }
  if (
    ["http:", "https:"].includes(url.protocol) &&
    hostname &&
    hostname !== ownHostname &&
    hostname !== "nvooman.com"
  ) {
    events.add("outbound_click");
  }
  return [...events];
}

export function pageViewEvents(pathname = "") {
  const path = pathname.toLocaleLowerCase().replace(/\/+$/, "") || "/";
  const events = new Set();
  if (path.includes("/keratopedia/") && !path.endsWith("/keratopedia")) {
    events.add("keratopedia_article_view");
  }
  if (path.includes("specialty-lenses") || path.includes("specialty_lenses")) {
    events.add("specialty_lens_page_view");
  }
  if (path.includes("scleral")) events.add("scleral_lens_page_view");
  if (path.includes("ocular-prosthetics") || path.includes("ocular_prosthetics")) {
    events.add("ocular_prosthesis_page_view");
  }
  return [...events];
}
