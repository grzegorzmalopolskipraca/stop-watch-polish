import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const distRoot = path.join(projectRoot, "dist");
const temporaryBuild = path.join(projectRoot, ".ssr-build");

function removeExistingSeoTags(html) {
  return html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\b(?=[^>]*\bname=["'](?:description|keywords|robots|twitter:card|twitter:title|twitter:description|twitter:image)["'])[^>]*>/gi, "")
    .replace(/<meta\b(?=[^>]*\bproperty=["'](?:og:title|og:description|og:type|og:url|og:image|og:locale|og:site_name)["'])[^>]*>/gi, "")
    .replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi, "")
    .replace(/<script\b[^>]*src=["']https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*><\/script>/gi, "")
    .replace(/<script\b[^>]*src=["']https:\/\/cdn\.onesignal\.com\/sdks\/web\/v16\/OneSignalSDK\.page\.js[^>]*><\/script>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?OneSignalDeferred[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, (script) =>
      script.includes("FAQPage") ? "" : script,
    );
}

try {
  const template = await readFile(path.join(distRoot, "index.html"), "utf8");
  const serverBundle = path.join(temporaryBuild, "ssg.js");
  const { renderStreetPage, STREET_SLUGS } = await import(pathToFileURL(serverBundle).href);

  for (const { slug } of STREET_SLUGS) {
    const { markup, head } = renderStreetPage(slug);
    const rootMarkup = `<div id="root" data-prerendered="true">${markup}</div>`;
    const html = removeExistingSeoTags(template)
      .replace('<div id="root"></div>', rootMarkup)
      .replace("</head>", `${head}\n</head>`);
    const routeDirectory = path.join(distRoot, "ulica", slug);
    await mkdir(routeDirectory, { recursive: true });
    await writeFile(path.join(routeDirectory, "index.html"), html);
  }

  const sitemapPath = path.join(distRoot, "sitemap.xml");
  let sitemap = await readFile(sitemapPath, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  sitemap = sitemap.replace(/<url>[\s\S]*?<\/url>/g, (urlEntry) => {
    if (urlEntry.includes("<loc>https://ejedzie.pl/</loc>")) {
      return urlEntry.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${today}</lastmod>`);
    }
    if (!urlEntry.includes("https://ejedzie.pl/ulica/")) return urlEntry;
    return urlEntry
      .replace(/(<loc>https:\/\/ejedzie\.pl\/ulica\/[^<]+?)(\/?)(<\/loc>)/, "$1/$3")
      .replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${today}</lastmod>`);
  });
  await writeFile(sitemapPath, sitemap);
} finally {
  await rm(temporaryBuild, { recursive: true, force: true });
}
