import { ArrowLeft, ArrowRight, MapPinned } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Seo from "@/components/Seo";
import RoadVoteCard from "@/components/RoadVoteCard";
import WroclawTrafficInsights from "@/components/WroclawTrafficInsights";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAdjacentRoads, getRoadPageHref, getUnmonitoredRoadBySlug } from "@/utils/wroclawRoadCatalog";
import { STREET_SLUGS } from "@/utils/streetSlug";

function RoadNotFound() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-5 px-4 py-10">
      <Seo title="Nie znaleźliśmy tej drogi | eJedzie.pl" description="Wyszukaj ulicę lub drogę Wrocławia w oficjalnym katalogu eJedzie.pl." noindex />
      <Link to="/ulice-wroclawia/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Katalog ulic Wrocławia</Link>
      <h1 className="text-3xl font-bold">Nie znaleźliśmy tej drogi</h1>
      <p className="text-muted-foreground">Sprawdź nazwę w katalogu albo zobacz ruch na monitorowanych ulicach.</p>
      <Button asChild><Link to="/ulice-wroclawia/">Otwórz katalog dróg</Link></Button>
    </main>
  );
}

export default function UnmonitoredRoadPage() {
  const { slug = "" } = useParams();
  const road = getUnmonitoredRoadBySlug(slug);

  if (!road) return <RoadNotFound />;

  const adjacentRoads = getAdjacentRoads(road);
  const canonical = `https://ejedzie.pl/ulica/${road.pageSlug}/`;
  const title = `Korki i utrudnienia — ${road.displayName}, Wrocław | eJedzie.pl`;
  const description = `${road.displayName} nie jest jeszcze monitorowana przez eJedzie.pl. Zagłosuj na pomiary ruchu i sprawdź miejskie statystyki korków, remontów i zdarzeń drogowych.`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `Głosowanie na monitoring: ${road.displayName} we Wrocławiu`,
      description,
      url: canonical,
      inLanguage: "pl-PL",
      isPartOf: { "@type": "WebSite", name: "eJedzie.pl", url: "https://ejedzie.pl/" },
      about: { "@type": "Place", name: `${road.displayName}, Wrocław` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "eJedzie.pl — korki Wrocław", item: "https://ejedzie.pl/" },
        { "@type": "ListItem", position: 2, name: "Ulice Wrocławia", item: "https://ejedzie.pl/ulice-wroclawia/" },
        { "@type": "ListItem", position: 3, name: road.displayName, item: canonical },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title={title}
        description={description}
        canonical={canonical}
        jsonLd={structuredData}
      />
      <main className="mx-auto max-w-4xl space-y-7 px-4 py-5 pb-12 sm:space-y-9 sm:px-6 sm:py-8">
        <header className="space-y-4">
          <Link to="/ulice-wroclawia/" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Wszystkie ulice Wrocławia</Link>
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"><MapPinned className="h-3.5 w-3.5" /> Droga jeszcze nie jest monitorowana</p>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Zagłosuj na monitoring: {road.displayName}</h1>
            <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
              Szukasz informacji o korkach, robotach drogowych, awarii szlabanu lub innym zdarzeniu na tej drodze? eJedzie.pl nie ma jeszcze
              jej własnych pomiarów. Nie przypisujemy jej danych z innych ulic. Twój głos pomoże ustalić, które drogi dodać do monitoringu.
            </p>
          </div>
          <Button asChild size="lg" className="min-h-12 w-full gap-2 rounded-xl text-base sm:w-auto">
            <Link to="/"><ArrowRight className="h-4 w-4" /> Otwórz mapę ruchu we Wrocławiu</Link>
          </Button>
        </header>

        <RoadVoteCard road={road} />

        <WroclawTrafficInsights />

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Ulice już objęte monitoringiem</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">Na tych stronach znajdziesz raporty zapisane bezpośrednio dla danej ulicy.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STREET_SLUGS.map((street) => (
              <Link key={street.slug} to={`/ulica/${street.slug}/`} className="flex min-h-11 items-center rounded-lg border bg-card px-3 py-2 text-sm hover:border-primary hover:text-primary">
                Korki: {street.name}
              </Link>
            ))}
          </div>
          <div className="space-y-2 pt-2">
            <h2 className="text-lg font-semibold">Więcej ulic i dróg z katalogu</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Inne pozycje z wykazu, uporządkowane alfabetycznie:</p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {adjacentRoads.map((relatedRoad) => (
                <li key={relatedRoad.id}>
                  <Link to={getRoadPageHref(relatedRoad)} className="flex min-h-11 items-center rounded-lg border bg-card px-3 py-2 text-sm hover:border-primary hover:text-primary">
                    {relatedRoad.displayName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-sm leading-relaxed text-muted-foreground">
              Statystyki na tej stronie są podsumowaniem zgłoszeń z monitorowanych dróg we Wrocławiu. Nie opisują aktualnego
              stanu na {road.displayName}. Dane dla tej drogi pojawią się dopiero po jej dodaniu do monitoringu.
            </CardContent>
          </Card>
        </section>

        <section className="rounded-2xl bg-muted/40 p-5 text-center sm:p-7">
          <h2 className="text-xl font-semibold">Sprawdź aktualne raporty z Wrocławia</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Przejdź do mapy eJedzie.pl, aby zobaczyć ruch na drogach objętych pomiarami.</p>
          <Button asChild className="mt-4 min-h-12 w-full rounded-xl sm:w-auto"><Link to="/">Zobacz mapę korków</Link></Button>
        </section>
      </main>
      <footer className="border-t px-4 py-5 text-center text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">eJedzie.pl — ruch i utrudnienia drogowe we Wrocławiu</Link>
      </footer>
    </div>
  );
}
