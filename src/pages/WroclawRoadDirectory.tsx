import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import Seo from "@/components/Seo";
import WroclawTrafficInsights from "@/components/WroclawTrafficInsights";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePublicStreetVotes } from "@/hooks/useStreetVotes";
import { getRoadPageHref, WROCLAW_ROADS, WROCLAW_ROAD_SOURCE } from "@/utils/wroclawRoadCatalog";

const TYPE_OPTIONS = [
  { value: "all", label: "Wszystkie drogi" },
  { value: "ul.", label: "Ulice" },
  { value: "al.", label: "Aleje" },
  { value: "rondo", label: "Ronda" },
  { value: "most", label: "Mosty" },
  { value: "other", label: "Pozostałe drogi" },
] as const;

type TypeFilter = (typeof TYPE_OPTIONS)[number]["value"];

function isOtherRoad(type: string) {
  return !["ul.", "al.", "rondo", "most"].includes(type);
}

function firstLetter(name: string) {
  const letter = name.trim().charAt(0).toLocaleUpperCase("pl-PL");
  return /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(letter) ? letter : "#";
}

function matchesType(type: string, filter: TypeFilter) {
  if (filter === "all") return true;
  if (filter === "other") return isOtherRoad(type);
  if (filter === "most") return type === "most" || type === "mosty";
  return type === filter;
}

export default function WroclawRoadDirectory() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const { data: votes = [] } = usePublicStreetVotes();

  const matchingRoads = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pl-PL");
    return WROCLAW_ROADS.filter((road) => matchesType(road.type, typeFilter))
      .filter((road) => !normalizedQuery || `${road.name} ${road.shortName} ${road.displayName}`.toLocaleLowerCase("pl-PL").includes(normalizedQuery))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "pl-PL", { sensitivity: "base" }));
  }, [query, typeFilter]);

  const groups = useMemo(() => matchingRoads.reduce<Record<string, typeof matchingRoads>>((result, road) => {
    const letter = firstLetter(road.name);
    (result[letter] ??= []).push(road);
    return result;
  }, {}), [matchingRoads]);

  const popularRoads = votes.map((vote) => ({
    vote,
    road: WROCLAW_ROADS.find((road) => road.name.toLocaleLowerCase("pl-PL") === vote.street_name.toLocaleLowerCase("pl-PL")
      || road.monitoredStreet?.toLocaleLowerCase("pl-PL") === vote.street_name.toLocaleLowerCase("pl-PL")),
  })).filter((item) => item.road).slice(0, 5);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Ulice i drogi Wrocławia — raporty ruchu i głosowanie",
      description: "Katalog ulic, alei, rond i mostów Wrocławia. Sprawdź raporty monitorowanych dróg lub zagłosuj na kolejną.",
      url: "https://ejedzie.pl/ulice-wroclawia/",
      inLanguage: "pl-PL",
      isPartOf: { "@type": "WebSite", name: "eJedzie.pl", url: "https://ejedzie.pl/" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "eJedzie.pl — korki Wrocław", item: "https://ejedzie.pl/" },
        { "@type": "ListItem", position: 2, name: "Ulice Wrocławia", item: "https://ejedzie.pl/ulice-wroclawia/" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Ulice Wrocławia — korki, raporty i głosowanie | eJedzie.pl"
        description="Przeszukaj katalog ulic i dróg Wrocławia. Sprawdź zapisane raporty o korkach, robotach i zdarzeniach lub zagłosuj na ulicę do monitorowania."
        canonical="https://ejedzie.pl/ulice-wroclawia/"
        jsonLd={structuredData}
      />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-5 pb-12 sm:space-y-10 sm:px-6 sm:py-8">
        <header className="space-y-4">
          <Link to="/" className="text-sm font-medium text-primary hover:underline">← Mapa ruchu Wrocławia</Link>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Ulice i drogi Wrocławia</h1>
            <p className="max-w-3xl leading-relaxed text-muted-foreground">
              Znajdź ulicę, aleję, rondo lub most. Na monitorowanych drogach zobaczysz zapisane raporty ruchu. Na pozostałych możesz
              zagłosować, by mieszkańcy wskazali, co dodać do eJedzie.pl w następnej kolejności.
            </p>
          </div>
          <Button asChild size="lg" className="min-h-12 w-full gap-2 rounded-xl text-base sm:w-auto">
            <Link to="/"><ArrowRight className="h-4 w-4" /> Otwórz mapę korków Wrocławia</Link>
          </Button>
        </header>

        <section aria-labelledby="directory-title" className="space-y-4">
          <div>
            <h2 id="directory-title" className="text-xl font-semibold">Znajdź drogę</h2>
            <p className="mt-1 text-sm text-muted-foreground">Wykaz obejmuje {WROCLAW_ROADS.length.toLocaleString("pl-PL")} nazwanych dróg z rejestru EMUiA.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Wpisz nazwę ulicy…" aria-label="Szukaj ulicy lub drogi" className="min-h-12 pl-10" />
            </label>
            <label className="sr-only" htmlFor="road-type-filter">Rodzaj drogi</label>
            <select id="road-type-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)} className="min-h-12 rounded-md border border-input bg-background px-3 text-sm">
              {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <p aria-live="polite" className="text-sm text-muted-foreground">Znaleziono {matchingRoads.length.toLocaleString("pl-PL")} dróg.</p>
          {popularRoads.length > 0 && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <h3 className="mb-2 text-sm font-semibold">Najwięcej głosów mieszkańców</h3>
              <ul className="flex flex-wrap gap-2">
                {popularRoads.map(({ vote, road }) => road && (
                  <li key={road.id}>
                    <Link to={getRoadPageHref(road)} className="inline-flex min-h-10 items-center gap-2 rounded-full border bg-background px-3 text-sm hover:border-primary hover:text-primary">
                      {road.displayName}<span className="font-semibold tabular-nums">{vote.votes}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            {Object.entries(groups).map(([letter, roads]) => (
              <details key={letter} open={query.trim().length > 0} className="group rounded-xl border bg-card">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
                  <span>{letter}</span>
                  <span className="text-sm font-normal text-muted-foreground">{roads.length} {roads.length === 1 ? "droga" : "dróg"}</span>
                </summary>
                <ul className="grid gap-x-4 border-t px-4 py-2 sm:grid-cols-2 lg:grid-cols-3">
                  {roads.map((road) => (
                    <li key={road.id} className="min-w-0 border-b last:border-b-0 sm:border-b-0">
                      <Link to={getRoadPageHref(road)} className="flex min-h-11 items-center justify-between gap-2 py-2 text-sm hover:text-primary">
                        <span className="min-w-0 truncate">{road.displayName}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{road.monitoredStreet ? "raporty" : "głosuj"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            {matchingRoads.length === 0 && <p className="rounded-xl border p-5 text-sm text-muted-foreground">Nie znaleźliśmy takiej nazwy w wykazie dróg Wrocławia.</p>}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Katalog oparto na oficjalnym rejestrze EMUiA Wrocławia z dnia {WROCLAW_ROAD_SOURCE.date.slice(0, 4)}-{WROCLAW_ROAD_SOURCE.date.slice(4, 6)}-{WROCLAW_ROAD_SOURCE.date.slice(6, 8)}.
          </p>
        </section>

        <WroclawTrafficInsights />

        <section className="rounded-2xl bg-muted/40 p-5 text-center sm:p-7">
          <h2 className="text-xl font-semibold">Sprawdź, co dzieje się na monitorowanych ulicach</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Otwórz mapę, aby zobaczyć dostępne informacje o bieżącym ruchu w eJedzie.pl.</p>
          <Button asChild className="mt-4 min-h-12 w-full rounded-xl sm:w-auto"><Link to="/">Przejdź do mapy ruchu</Link></Button>
        </section>
      </main>
      <footer className="border-t px-4 py-5 text-center text-sm text-muted-foreground"><Link to="/" className="hover:text-foreground">eJedzie.pl — ruch drogowy we Wrocławiu</Link></footer>
    </div>
  );
}
