import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "scleral-lenses.html");
const source = await readFile(sourcePath, "utf8");
const headStart = source.slice(0, source.indexOf('<script type="application/ld+json">'));
const bodyStart = source.indexOf("</head><body>");
const mainStart = source.indexOf('<main id="main">', bodyStart);
const mainEnd = source.indexOf("</main>", mainStart) + 7;
const shellBefore = source.slice(bodyStart, mainStart);
const shellAfter = source.slice(mainEnd);

const title = "عدسات سكليرال في البريمي | فحص وتركيب ومتابعة في عُمان";
const description = "تقييم وتركيب العدسات السكليرال في البريمي للقرنية المخروطية والقرنيات غير المنتظمة، مع خرائط القرنية والتجربة والتدريب والمتابعة.";
const url = "https://nvooman.com/scleral-lenses-al-buraimi";
const person = {"@type":"Person","@id":"https://nvooman.com/#nasser-alshamli","name":"ناصر الشملي","jobTitle":"أخصائي بصريات إكلينيكي — مختص القرنية المخروطية والعدسات المتخصصة","alumniOf":{"@type":"CollegeOrUniversity","name":"University of New South Wales, Australia"}};
const schema = {"@context":"https://schema.org","@graph":[{"@type":["Optician","LocalBusiness"],"@id":"https://nvooman.com/#organization","name":"الرؤية الجديدة للبصريات","alternateName":"New Vision Optics","url":"https://nvooman.com/","telephone":"+96871120244","email":"info@nvooman.com","address":{"@type":"PostalAddress","addressLocality":"البريمي","addressRegion":"محافظة البريمي","addressCountry":"OM"},"areaServed":[{"@type":"City","name":"البريمي"},{"@type":"Country","name":"سلطنة عُمان"}]},person,{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"الرئيسية","item":"https://nvooman.com/"},{"@type":"ListItem","position":2,"name":"العدسات السكليرال","item":"https://nvooman.com/scleral-lenses"},{"@type":"ListItem","position":3,"name":"العدسات السكليرال في البريمي","item":url}]},{"@type":"MedicalWebPage","@id":`${url}#webpage`,"name":title,"url":url,"description":description,"inLanguage":"ar-OM","dateModified":"2026-08-16","reviewedBy":{"@id":"https://nvooman.com/#nasser-alshamli"},"primaryImageOfPage":"https://nvooman.com/assets/og-cover.jpg","about":{"@type":"Service","name":"تقييم وتركيب العدسات السكليرال في البريمي","serviceType":"Scleral lens assessment and fitting","provider":{"@id":"https://nvooman.com/#organization"},"areaServed":{"@type":"City","name":"البريمي"}}}]};

const head = headStart
  .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
  .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${description}">`)
  .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}">`)
  .replace(/<link rel="alternate"[\s\S]*?<link rel="icon"/, `<link rel="alternate" hreflang="ar-OM" href="${url}">\n<link rel="alternate" hreflang="x-default" href="${url}">\n<link rel="icon"`)
  .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${title}">`)
  .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${description}">`)
  .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}">`);

const main = `<main id="main">
<section class="page-hero"><div class="container"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="./">الرئيسية</a><span>/</span><a href="scleral-lenses">العدسات السكليرال</a><span>/</span><span>البريمي</span></nav><h1>العدسات السكليرال في البريمي</h1><p>خدمة متخصصة لتقييم وتركيب ومتابعة العدسات السكليرال للقرنية المخروطية والقرنيات غير المنتظمة، للمرضى من البريمي ومختلف ولايات سلطنة عُمان.</p></div></section>
<section class="section"><div class="container content-grid"><article class="article">
<section><h2>أين يتم تقييم العدسات السكليرال في البريمي؟</h2><p>يبدأ التقييم في الرؤية الجديدة للبصريات بالبريمي بمراجعة التقارير والأعراض وقياس النظر وفحص سطح العين. قد تُراجع خرائط القرنية أو يُطلب تصوير حديث عند الحاجة، ثم تُجرّب عدسة تشخيصية لتقييم ارتفاع العدسة وارتكازها والرؤية والراحة. تواصل قبل الزيارة لتأكيد الموعد والفرع الذي تتوفر فيه الخدمة.</p></section>
<section><h2>لمن قد تناسب العدسات السكليرال؟</h2><p>قد تُقيّم للقرنية المخروطية، وعدم انتظام القرنية بعد الجراحة أو زراعة القرنية، وبعض الندبات القرنية عندما لا تحقق النظارة أو العدسات التقليدية رؤية مناسبة. القرار لا يعتمد على التشخيص وحده؛ بل على القياسات وصحة سطح العين والتجربة الفعلية.</p></section>
<section><h2>مراحل التركيب والمتابعة</h2><ol><li>مراجعة التاريخ البصري والتقارير والعدسات السابقة.</li><li>فحص النظر والقرنية وسطح العين وخرائط القرنية عند الحاجة.</li><li>تجربة التصميم وقياس الارتفاع والحافة وجودة الرؤية.</li><li>طلب العدسة المخصصة ثم فحصها عند التسليم.</li><li>تدريب عملي على اللبس والإزالة والتنظيف والملء.</li><li>متابعة الراحة والرؤية وصحة العين وإجراء التعديلات اللازمة.</li></ol></section>
<section><h2>القادمون من خارج البريمي</h2><p>إذا كنت قادمًا من لوى أو ضنك أو ينقل أو أي ولاية أخرى، أرسل تقاريرك وصور القرنية واسم العدسات الحالية عبر واتساب قبل الموعد. يساعد ذلك الفريق على توجيهك والاستعداد للتقييم، لكنه لا يغني عن الفحص المباشر.</p></section>
<section><h2>ما الذي تحضره معك؟</h2><ul><li>النظارة والعدسات الحالية وعلبتها.</li><li>تقارير طبيب العيون وخرائط القرنية السابقة.</li><li>أسماء المحاليل ومدة اللبس اليومية.</li><li>قائمة واضحة بالأعراض مثل الضبابية أو الاحمرار أو عدم الراحة.</li></ul></section>
<section><h2>العناية الآمنة بعد التسليم</h2><p>تحتاج العدسة السكليرال عادة إلى محلول ملحي معقم وخالٍ من المواد الحافظة للملء، إضافة إلى نظام تنظيف مناسب يحدده المختص. لا تستخدم ماء الصنبور مع العدسة أو العلبة. راجع <a href="lens-solutions">دليل محاليل وأدوات العدسات</a>، وانزع العدسة واطلب التقييم عند الألم أو الاحمرار المستمر أو الإفرازات أو انخفاض الرؤية المفاجئ.</p></section>
<section><h2>معلومات مرتبطة</h2><p>لشرح أوسع راجع <a href="scleral-lenses">دليل العدسات السكليرال في عُمان</a>، و<a href="keratoconus">فحص القرنية المخروطية</a>، و<a href="corneal-topography">تصوير وخرائط القرنية</a>، و<a href="specialty-lenses">العدسات الصلبة RGP والتخصصية</a>.</p></section>
<div class="notice">المحتوى للتوعية ولا يستبدل فحص طبيب العيون أو التقييم السريري المباشر.</div>
<p class="review-note">راجع المحتوى: <strong>ناصر الشملي</strong> — أخصائي بصريات إكلينيكي، مختص القرنية المخروطية والعدسات المتخصصة · آخر مراجعة: <time datetime="2026-08-16">16 أغسطس 2026</time></p>
</article><aside class="sidebar"><figure class="sidebar-visual"><img decoding="async" src="assets/scleral.svg" width="800" height="600" alt="رسم توضيحي لعدسة سكليرال تعبر فوق القرنية"></figure><div class="sidebar-box"><h3>احجز تقييمًا في البريمي</h3><p>أرسل التقارير المتوفرة وموقعك لتأكيد الفرع والموعد المناسبين.</p><a class="btn btn-primary full" href="https://wa.me/96871120244?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%AD%D8%AC%D8%B2%20%D8%AA%D9%82%D9%8A%D9%8A%D9%85%20%D9%84%D9%84%D8%B9%D8%AF%D8%B3%D8%A7%D8%AA%20%D8%A7%D9%84%D8%B3%D9%83%D9%84%D9%8A%D8%B1%D8%A7%D9%84%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%A8%D8%B1%D9%8A%D9%85%D9%8A." target="_blank" rel="noopener">تواصل عبر واتساب</a></div><div class="sidebar-box"><h3>الفروع</h3><p>راجع العناوين وأرقام التواصل قبل الزيارة.</p><a class="text-link" href="branches">عرض فروع البريمي وعُمان</a></div></aside></div></section>
</main>`;

await writeFile(path.join(root, "scleral-lenses-al-buraimi.html"), `${head}<script type="application/ld+json">${JSON.stringify(schema)}</script>\n${shellBefore}${main}${shellAfter}`);

let scleral = source;
scleral = scleral.replace('<section><h2>خدمة العدسات السكليرال في سلطنة عُمان</h2>', '<section><h2>خدمة العدسات السكليرال في سلطنة عُمان</h2>');
scleral = scleral.replace('يتوفر التقييم المتخصص في البريمي، وقد تتاح المتابعة في فروع مختارة بعد التنسيق.', 'يتوفر التقييم المتخصص في البريمي، وقد تتاح المتابعة في فروع مختارة بعد التنسيق. راجع <a href="scleral-lenses-al-buraimi">دليل تقييم العدسات السكليرال في البريمي</a> للاستعداد للزيارة ومراحل التركيب.');
await writeFile(sourcePath, scleral);

const branchesPath = path.join(root, "branches.html");
let branches = await readFile(branchesPath, "utf8");
branches = branches.replace('بعض الخدمات التخصصية مثل تصوير القرنية وتركيب العدسات السكليرال والعيون الصناعية قد تكون متاحة في فروع أو مواعيد محددة.', 'بعض الخدمات التخصصية مثل تصوير القرنية وتركيب العدسات السكليرال والعيون الصناعية قد تكون متاحة في فروع أو مواعيد محددة. يمكن مراجعة <a href="scleral-lenses-al-buraimi">دليل العدسات السكليرال في البريمي</a> قبل الحجز.');
await writeFile(branchesPath, branches);

const sitemapPath = path.join(root, "sitemap.xml");
let sitemap = await readFile(sitemapPath, "utf8");
if (!sitemap.includes("scleral-lenses-al-buraimi")) {
  sitemap = sitemap.replace("</urlset>", '  <url><loc>https://nvooman.com/scleral-lenses-al-buraimi</loc><lastmod>2026-08-16</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>');
}
await writeFile(sitemapPath, sitemap);

console.log("Built the Al Buraimi scleral lens landing page and internal links.");
