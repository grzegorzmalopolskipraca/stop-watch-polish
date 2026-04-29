import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { slugToStreet, STREET_SLUGS } from "@/utils/streetSlug";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

/**
 * Per-street SEO landing page. Sets street in localStorage so the main app
 * picks it up, then redirects to "/". This keeps the visual UI identical
 * while giving Google a unique, indexable URL per street with rich metadata.
 */
const StreetPage = () => {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const street = slugToStreet(slug);

  useEffect(() => {
    if (street) {
      try {
        localStorage.setItem("selectedStreet", street);
      } catch {
        /* ignore */
      }
      // Redirect to main page where the actual UI lives
      const t = setTimeout(() => navigate("/", { replace: true }), 50);
      return () => clearTimeout(t);
    }
  }, [street, navigate]);

  if (!street) {
    return (
      <div className="min-h-screen bg-background">
        <Seo
          title="Ulica nie znaleziona — eJedzie.pl"
          description="Wybrana ulica nie jest jeszcze monitorowana w eJedzie.pl."
          noindex
        />
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Link to="/">
            <Button variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" /> Powrót</Button>
          </Link>
          <h1 className="text-2xl font-bold mt-4">Ulica nie znaleziona</h1>
          <p className="text-muted-foreground mt-2">
            Lista monitorowanych ulic we Wrocławiu:
          </p>
          <ul className="list-disc pl-6 mt-2">
            {STREET_SLUGS.map((s) => (
              <li key={s.slug}><Link className="underline" to={`/ulica/${s.slug}`}>{s.name}</Link></li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const url = `https://ejedzie.pl/ulica/${slug}`;
  const title = `Korki na ulicy ${street} — Wrocław na żywo | eJedzie.pl`;
  const description = `Aktualny ruch i prognoza przejazdu ulicą ${street} we Wrocławiu. Społecznościowe raporty korków, wypadków i utrudnień. Sprawdź najlepszy czas wyjazdu.`;

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={title}
        description={description}
        canonical={url}
        keywords={`korki ${street} Wrocław, ruch ${street}, ${street} korek, wypadek ${street} Wrocław, utrudnienia ${street}`}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Place",
            name: `Ulica ${street}, Wrocław`,
            address: {
              "@type": "PostalAddress",
              streetAddress: street,
              addressLocality: "Wrocław",
              addressCountry: "PL",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Strona główna", item: "https://ejedzie.pl/" },
              { "@type": "ListItem", position: 2, name: `Ulica ${street}`, item: url },
            ],
          },
        ]}
      />
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">
          Korki na ulicy {street} we Wrocławiu — aktualny ruch i prognoza
        </h1>
        <p className="text-muted-foreground mt-2">Ładowanie aktualnego stanu ruchu…</p>
        <p className="mt-4">
          <Link to="/" className="underline">Przejdź do mapy ruchu</Link>
        </p>
      </div>
    </div>
  );
};

export default StreetPage;
