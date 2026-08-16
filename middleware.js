const canonicalOrigin = "https://nvooman.com";
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
  matcher: ["/", "/:legacy", "/f/:path*"],
};

export default function middleware(request) {
  const requestUrl = new URL(request.url);
  let pathname;

  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    return;
  }

  const isLegacyBlog =
    pathname === "/" && requestUrl.searchParams.get("blog") === "y";
  const destination = isLegacyBlog
    ? "/keratopedia"
    : legacyArabicRedirects.get(pathname) ??
      (pathname.startsWith("/f/") ? "/keratopedia" : undefined);
  if (!destination) return;

  const location = new URL(destination, canonicalOrigin);
  const destinationSearch = new URLSearchParams(requestUrl.searchParams);
  if (isLegacyBlog) destinationSearch.delete("blog");
  location.search = destinationSearch.toString();

  return new Response(null, {
    status: 301,
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=86400",
      Location: location.href,
    },
  });
}
