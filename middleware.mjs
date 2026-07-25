const canonicalOrigin = "https://www.nvooman.com";
const legacyArabicRedirects = new Map([
  ["/خدماتنا", "/"],
  ["/أفرعنا", "/branches"],
  ["/العروض-الحصرية", "/scleral-lenses"],
  ["/ركن-المنشورات", "/keratopedia"],
  [
    "/f/مواصفات-عدسات-السكليرال-للقرنية-المخروطية",
    "/scleral-lenses",
  ],
]);

export const config = {
  matcher: ["/:legacy", "/f/:path*"],
};

export default function middleware(request) {
  const requestUrl = new URL(request.url);
  let pathname;

  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    return;
  }

  const destination =
    legacyArabicRedirects.get(pathname) ??
    (pathname.startsWith("/f/") ? "/keratopedia" : undefined);
  if (!destination) return;

  const location = new URL(destination, canonicalOrigin);
  location.search = requestUrl.search;

  return new Response(null, {
    status: 301,
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=86400",
      Location: location.href,
    },
  });
}
