import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, ArrowUpRight, Clock3, MapPin, TriangleAlert } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { slugToStreet, STREET_SLUGS, streetInLocative, streetToSlug, type StreetName } from "@/utils/streetSlug";

declare global {
  interface Window {
    gtag?: (command: "event", eventName: string, parameters: Record<string, string>) => void;
  }
}

type CountByLabel = { label: string; count: number };
type TrafficSnapshot = {
  status: string;
  direction: string;
  reported_at: string;
  speed: number | null;
};
type IncidentSnapshot = {
  incident_type: string;
  direction: string;
  reported_at: string;
};
type StreetStats = {
  traffic_total: number;
  traffic_12_months: number;
  incidents_total: number;
  incidents_12_months: number;
  last_traffic_report: TrafficSnapshot | null;
  traffic_by_weekday: CountByLabel[];
  traffic_by_month: CountByLabel[];
  traffic_by_year: CountByLabel[];
  traffic_by_time_of_day: CountByLabel[];
  traffic_by_status: CountByLabel[];
  incidents_by_type: CountByLabel[];
  latest_incidents: IncidentSnapshot[];
  updated_at: string;
};

const WEEKDAYS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"];
const STATUS_LABELS: Record<string, string> = {
  jedzie: "Ruch płynny",
  toczy_sie: "Ruch spowolniony",
  stoi: "Zator / postój",
};
const STATUS_COLORS: Record<string, string> = {
  jedzie: "bg-emerald-500",
  toczy_sie: "bg-amber-500",
  stoi: "bg-rose-500",
};
const INCIDENT_LABELS: Record<string, string> = {
  Blokada: "Blokada",
  Wypadek: "Wypadek",
  Objazd: "Objazd",
  Roboty: "Roboty drogowe",
  Ślisko: "Śliska nawierzchnia",
  Dziury: "Ubytki w jezdni",
  Zwierze: "Zwierzę na drodze",
  Awaria: "Awaria",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(new Date(value));
}

function formatRelativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "przed chwilą";
  if (minutes < 60) return `${minutes} min temu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} godz. temu`;
  const days = Math.floor(hours / 24);
  return `${days} dni temu`;
}

function BarList({ items, color = "bg-primary" }: { items: CountByLabel[]; color?: string }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate text-muted-foreground">{item.label}</span>
            <span className="font-medium tabular-nums">{item.count.toLocaleString("pl-PL")}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${item.label}: ${item.count} raportów`}
          >
            <div className={`h-full rounded-full ${color}`} style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function TrafficStatus({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? "Raport ruchu";
  const color = STATUS_COLORS[status] ?? "bg-muted-foreground";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm font-medium">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function MainPageLink({ street, placement }: { street: StreetName; placement: "top" | "bottom" }) {
  return (
    <div className="flex justify-center">
      <Button asChild size="lg" className="min-h-12 w-full max-w-md gap-2 rounded-xl text-base font-semibold sm:w-auto">
        <Link
          to={`/?street=${encodeURIComponent(streetToSlug(street))}`}
          reloadDocument
          onClick={() => window.gtag?.("event", "street_landing_map_click", {
            street_slug: streetToSlug(street),
            placement,
            transport_type: "beacon",
          })}
        >
          {placement === "top" ? <Activity className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
          Sprawdź bieżący ruch na ul. {streetInLocative(street)}
        </Link>
      </Button>
    </div>
  );
}

function StreetPage() {
  const { slug = "" } = useParams();
  const street = slugToStreet(slug);
  const streetLocative = street ? streetInLocative(street) : "";
  const canonical = `https://ejedzie.pl/ulica/${slug}/`;
  const title = street
    ? `Korki na ul. ${streetLocative} — Wrocław | eJedzie.pl`
    : "Ulica nieznaleziona | eJedzie.pl";
  const description = street
    ? `Raporty korków, ruchu i zdarzeń na ulicy ${streetLocative} we Wrocławiu. Zobacz zapisaną historię, statystyki według dni i miesięcy oraz sprawdź bieżący ruch.`
    : "Wybrana ulica nie jest monitorowana w eJedzie.pl.";

  useEffect(() => {
    if (!street || document.querySelector('script[src*="adsbygoogle.js"]')) return;

    const adsScript = document.createElement("script");
    adsScript.async = true;
    adsScript.crossOrigin = "anonymous";
    adsScript.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2442601232836054";
    document.head.appendChild(adsScript);
  }, [street]);

  const { data: stats, isPending, isError } = useQuery({
    queryKey: ["street-seo-stats", street],
    enabled: Boolean(street),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Importing the browser client inside the query keeps static rendering
      // independent from runtime credentials and never calls a traffic provider.
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.rpc("get_street_seo_stats", { p_street: street! });
      if (error) throw error;
      return data as unknown as StreetStats;
    },
  });

  const hasNoReports = Boolean(stats && stats.traffic_total === 0 && stats.incidents_total === 0);

  if (!street) {
    return (
      <main className="min-h-screen bg-background px-4 py-10">
        <Seo title={title} description={description} canonical={canonical} noindex />
        <div className="mx-auto max-w-3xl">
          <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" to="/">
            <ArrowLeft className="h-4 w-4" /> Strona główna
          </Link>
          <h1 className="mt-6 text-3xl font-bold">Nie znaleźliśmy tej ulicy</h1>
          <p className="mt-2 text-muted-foreground">Zobacz raporty dla jednej z monitorowanych ulic we Wrocławiu.</p>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STREET_SLUGS.map((item) => (
              <li key={item.slug}><Link className="text-primary underline-offset-4 hover:underline" to={`/ulica/${item.slug}/`}>{item.name}</Link></li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `Raporty ruchu na ulicy ${street} we Wrocławiu`,
      description,
      url: canonical,
      inLanguage: "pl-PL",
      isPartOf: { "@type": "WebSite", name: "eJedzie.pl", url: "https://ejedzie.pl/" },
      about: { "@type": "Place", name: `ul. ${street}, Wrocław` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "eJedzie.pl — korki Wrocław", item: "https://ejedzie.pl/" },
        { "@type": "ListItem", position: 2, name: `ul. ${street} we Wrocławiu`, item: canonical },
      ],
    },
  ];
  const weekdays = stats?.traffic_by_weekday?.map((item, index) => ({
    label: WEEKDAYS[index] ?? item.label,
    count: item.count,
  })) ?? WEEKDAYS.map((label) => ({ label, count: 0 }));
  const months = stats?.traffic_by_month?.map((item) => ({
    ...item,
    label: new Intl.DateTimeFormat("pl-PL", { month: "short", year: "2-digit", timeZone: "Europe/Warsaw" })
      .format(new Date(`${item.label}-01T12:00:00`)),
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo title={title} description={description} canonical={canonical} jsonLd={structuredData} noindex={hasNoReports} />
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="text-lg font-bold tracking-tight">eJedzie.pl</Link>
          <Link to="/" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Wszystkie ulice</span><span className="sm:hidden">Wróć</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-8">
        <nav aria-label="Okruszki" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link className="hover:text-foreground" to="/">Korki we Wrocławiu</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground">ul. {street}</li>
          </ol>
        </nav>

        <section className="space-y-4 text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <MapPin className="h-3.5 w-3.5" /> Wrocław · raporty zapisane w eJedzie.pl
          </p>
          <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Korki i ruch na ulicy {streetLocative} we Wrocławiu
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Sprawdź ostatni zapis ruchu, zgłoszone zdarzenia i historię raportów dla ulicy {streetLocative}. Statystyki powstają z danych zapisanych w eJedzie.pl.
          </p>
          <MainPageLink street={street} placement="top" />
          <p className="mx-auto max-w-xl text-xs leading-relaxed text-muted-foreground">
            Historia na tej stronie może być opóźniona. Na mapie głównej sprawdzisz bieżący odczyt.
          </p>
        </section>

        <Separator />

        <section aria-labelledby="street-latest-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="street-latest-heading" className="text-xl font-semibold">Ostatni zapis ruchu</h2>
          </div>
          {isPending ? (
            <p className="rounded-xl border p-4 text-sm text-muted-foreground" aria-live="polite">Wczytujemy zapisane raporty dla tej ulicy…</p>
          ) : stats?.last_traffic_report ? (
            <Card>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <TrafficStatus status={stats.last_traffic_report.status} />
                  <span className="text-sm text-muted-foreground">{stats.last_traffic_report.direction === "to_center" ? "w kierunku centrum" : "od centrum"}</span>
                  {stats.last_traffic_report.speed != null && <span className="text-sm font-medium">{stats.last_traffic_report.speed} km/h</span>}
                </div>
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock3 className="h-4 w-4" aria-hidden="true" />
                  {formatDateTime(stats.last_traffic_report.reported_at)} ({formatRelativeTime(stats.last_traffic_report.reported_at)})
                </p>
              </CardContent>
            </Card>
          ) : (
            <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
              {isError ? "Nie udało się teraz wczytać zapisanych danych. Spróbuj ponownie później." : "Nie ma jeszcze zapisanego raportu ruchu dla tej ulicy."}
            </p>
          )}
        </section>

        <section aria-labelledby="street-statistics-heading" className="space-y-4">
          <div>
            <h2 id="street-statistics-heading" className="text-xl font-semibold">Statystyki ulicy {streetLocative}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Zestawienie zapisanych raportów z ostatnich 12 miesięcy i dostępnych lat.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Raporty ruchu" value={stats ? stats.traffic_12_months.toLocaleString("pl-PL") : "—"} note="ostatnie 12 miesięcy" />
            <StatCard label="Zdarzenia" value={stats ? stats.incidents_12_months.toLocaleString("pl-PL") : "—"} note="ostatnie 12 miesięcy" />
            <StatCard label="Raporty łącznie" value={stats ? stats.traffic_total.toLocaleString("pl-PL") : "—"} note="cała zapisana historia" />
            <StatCard label="Zdarzenia łącznie" value={stats ? stats.incidents_total.toLocaleString("pl-PL") : "—"} note="cała zapisana historia" />
          </div>

          <Card>
            <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
              <CardTitle className="text-base">Kiedy zapisywano raporty ruchu?</CardTitle>
              <p className="text-sm text-muted-foreground">Liczba raportów według dnia tygodnia, z ostatnich 12 miesięcy.</p>
            </CardHeader>
            <CardContent className="p-4 pt-3 sm:p-5 sm:pt-3">
              {isPending ? <p className="text-sm text-muted-foreground">Wczytujemy zapisane raporty dla tej ulicy…</p> : stats?.traffic_12_months ? <BarList items={weekdays} /> : <p className="text-sm text-muted-foreground">W tym okresie nie ma jeszcze raportów do porównania.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
              <CardTitle className="text-base">Jak opisywano ruch?</CardTitle>
              <p className="text-sm text-muted-foreground">Liczba raportów według stanu ruchu z ostatnich 12 miesięcy.</p>
            </CardHeader>
            <CardContent className="p-4 pt-3 sm:p-5 sm:pt-3">
              {isPending ? <p className="text-sm text-muted-foreground">Wczytujemy zapisane raporty dla tej ulicy…</p> : stats?.traffic_12_months ? <BarList items={stats.traffic_by_status} /> : <p className="text-sm text-muted-foreground">W tym okresie nie ma jeszcze raportów do porównania.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
              <CardTitle className="text-base">Historia miesiąc po miesiącu</CardTitle>
              <p className="text-sm text-muted-foreground">Liczba zapisanych raportów ruchu. Puste miesiące mają wartość 0.</p>
            </CardHeader>
            <CardContent className="p-4 pt-3 sm:p-5 sm:pt-3">
              {isPending ? <p className="text-sm text-muted-foreground">Wczytujemy historię raportów…</p> : stats?.traffic_12_months && months?.length ? <BarList items={months} color="bg-sky-500" /> : <p className="text-sm text-muted-foreground">Brak danych miesięcznych.</p>}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <CardTitle className="text-base">Raporty według pory dnia</CardTitle>
                <p className="text-sm text-muted-foreground">Rozkład godzinowy z ostatnich 12 miesięcy.</p>
              </CardHeader>
              <CardContent className="p-4 pt-3 sm:p-5 sm:pt-3">
                {isPending ? <p className="text-sm text-muted-foreground">Wczytujemy historię raportów…</p> : stats?.traffic_12_months ? <BarList items={stats.traffic_by_time_of_day} color="bg-violet-500" /> : <p className="text-sm text-muted-foreground">Brak danych godzinowych.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <CardTitle className="text-base">Raporty w poszczególnych latach</CardTitle>
                <p className="text-sm text-muted-foreground">Roczne porównanie zapisanej historii.</p>
              </CardHeader>
              <CardContent className="p-4 pt-3 sm:p-5 sm:pt-3">
                {isPending ? <p className="text-sm text-muted-foreground">Wczytujemy historię raportów…</p> : stats?.traffic_by_year?.length ? <BarList items={stats.traffic_by_year} color="bg-emerald-600" /> : <p className="text-sm text-muted-foreground">Brak danych rocznych.</p>}
              </CardContent>
            </Card>
          </div>
        </section>

        <section aria-labelledby="street-incidents-heading" className="space-y-4">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-600" aria-hidden="true" />
            <div>
              <h2 id="street-incidents-heading" className="text-xl font-semibold">Zdarzenia drogowe na ul. {streetLocative}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Zgłoszenia zapisane przez użytkowników eJedzie.pl. Najnowsze na górze.</p>
            </div>
          </div>
          {isPending ? (
            <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">Wczytujemy zgłoszenia dla tej ulicy…</p>
          ) : stats?.latest_incidents?.length ? (
            <ul className="divide-y rounded-xl border bg-card">
              {stats.latest_incidents.map((incident, index) => (
                <li key={`${incident.reported_at}-${incident.incident_type}-${index}`} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">{INCIDENT_LABELS[incident.incident_type] ?? incident.incident_type}</span>
                  <span className="text-sm text-muted-foreground">
                    {incident.direction === "to_center" ? "w kierunku centrum" : "od centrum"} · {formatDateTime(incident.reported_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">Brak zapisanych zgłoszeń z ostatnich 30 dni.</p>
          )}
          {stats?.incidents_by_type?.length ? (
            <Card>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <CardTitle className="text-base">Rodzaje zgłoszonych zdarzeń</CardTitle>
                <p className="text-sm text-muted-foreground">Zestawienie z ostatnich 12 miesięcy.</p>
              </CardHeader>
              <CardContent className="p-4 pt-3 sm:p-5 sm:pt-3"><BarList items={stats.incidents_by_type} color="bg-amber-500" /></CardContent>
            </Card>
          ) : null}
        </section>

        {hasNoReports && (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Dla tej ulicy nie zapisano jeszcze raportów. Wróć tu później albo sprawdź mapę ruchu.
          </p>
        )}

        <section className="space-y-4 rounded-2xl bg-muted/40 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Sprawdź też ruch na innych ulicach Wrocławia</h2>
          <ul className="flex flex-wrap gap-2">
            {STREET_SLUGS.filter((item) => item.name !== street).slice(0, 6).map((item) => (
              <li key={item.slug}>
                <Link className="inline-flex min-h-10 items-center rounded-full border bg-background px-3 text-sm hover:border-primary hover:text-primary" to={`/ulica/${item.slug}/`}>
                  Korki: {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <MainPageLink street={street} placement="bottom" />
        <p className="text-center text-xs text-muted-foreground">
          Statystyki odzwierciedlają wyłącznie raporty zapisane w eJedzie.pl i nie są gwarancją aktualnego stanu drogi.
        </p>
        <p className="text-center text-xs text-muted-foreground">{stats?.updated_at ? `Dane pobrano ${formatDateTime(stats.updated_at)}.` : "Dane odświeżają się z zapisanymi raportami."}</p>
      </main>

      <footer className="border-t px-4 py-5 text-center text-sm text-muted-foreground">
        <Link className="hover:text-foreground" to="/">eJedzie.pl — korki i ruch drogowy we Wrocławiu</Link>
      </footer>
    </div>
  );
}

export default StreetPage;
