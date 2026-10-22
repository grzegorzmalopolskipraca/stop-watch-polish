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
  const { renderPage, PRERENDER_PATHS, STREET_SLUGS } = await import(pathToFileURL(serverBundle).href);

  for (const routePath of PRERENDER_PATHS) {
    const { markup, head } = renderPage(routePath);
    const rootMarkup = `<div id="root" data-prerendered="true">${markup}</div>`;
    const html = removeExistingSeoTags(template)
      .replace('<div id="root"></div>', rootMarkup)
      .replace("</head>", `${head}\n</head>`);
    const routeDirectory = path.join(distRoot, routePath.replace(/^\/+|\/+$/g, ""));
    await mkdir(routeDirectory, { recursive: true });
    await writeFile(path.join(routeDirectory, "index.html"), html);
  }

  const sitemapPath = path.join(distRoot, "sitemap.xml");
  const sitemap = await readFile(sitemapPath, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  const urlEntries = [...sitemap.matchAll(/<url>[\s\S]*?<\/url>/g)].map(([entry]) => entry);
  const keptEntries = urlEntries
    .filter((entry) => !entry.includes("https://ejedzie.pl/ulica/") && !entry.includes("https://ejedzie.pl/ulice-wroclawia/"))
    .map((entry) => entry.includes("<loc>https://ejedzie.pl/</loc>")
      ? entry.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${today}</lastmod>`)
      : entry);
  const monitoredPaths = new Set(STREET_SLUGS.map(({ slug }) => `/ulica/${slug}`));
  const sitemapPaths = [...monitoredPaths, "/ulice-wroclawia"];
  const generatedEntries = sitemapPaths.map((routePath) => {
    const monitored = monitoredPaths.has(routePath);
    const priority = routePath === "/ulice-wroclawia" ? "0.8" : "0.9";
    const changefreq = monitored ? "daily" : "weekly";
    return `  <url>\n    <loc>https://ejedzie.pl${routePath}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  });
  const openingTag = sitemap.match(/<urlset[^>]*>/)?.[0];
  if (!openingTag) throw new Error("Invalid sitemap: missing urlset opening tag");
  const updatedSitemap = `${openingTag}\n${[...keptEntries, ...generatedEntries].join("\n")}\n</urlset>\n`;
  await writeFile(sitemapPath, updatedSitemap);
} finally {
  await rm(temporaryBuild, { recursive: true, force: true });
}
