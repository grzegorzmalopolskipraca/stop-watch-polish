import { Helmet } from "react-helmet-async";

interface SeoProps {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  keywords?: string;
}

const SITE_URL = "https://ejedzie.pl";
const DEFAULT_OG = `${SITE_URL}/icon-512.png`;

export const Seo = ({
  title,
  description,
  canonical,
  noindex = false,
  ogImage = DEFAULT_OG,
  ogType = "website",
  jsonLd,
  keywords,
}: SeoProps) => {
  const url = canonical ?? (typeof window !== "undefined" ? window.location.href : SITE_URL);
  const fullTitle = title.length > 60 ? title : title;
  const desc = description.length > 160 ? description.slice(0, 157) + "..." : description;
  const lds = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />
      <meta
        name="robots"
        content={noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1"}
      />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="pl_PL" />
      <meta property="og:site_name" content="eJedzie.pl" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
      {lds.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
};

export default Seo;
