import { Activity, Clock3, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { STREETS, streetToSlug } from "@/utils/streetSlug";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWroclawSeoStats } from "@/hooks/useWroclawSeoStats";

const INCIDENT_LABELS: Record<string, string> = {
  Blokada: "Blokady",
  Wypadek: "Wypadki",
  Objazd: "Objazdy",
  Roboty: "Roboty drogowe",
  Ślisko: "Śliska nawierzchnia",
  Dziury: "Ubytki w jezdni",
  Zwierze: "Zwierzęta na drodze",
  Awaria: "Awarie",
};

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border bg-background p-3 sm:p-4">
      <p className="text-xs leading-tight text-muted-foreground sm:text-sm">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

export default function WroclawTrafficInsights() {
  const { data, isPending, isError } = useWroclawSeoStats();
  const traffic = data?.traffic;
  const incidents = data?.incidents;
  const strongestPeriods = traffic?.peak_periods?.slice(0, 3) ?? [];
  const busiestStreets = traffic?.streets_with_most_slow_reports?.slice(0, 5) ?? [];
  const maxShare = Math.max(1, ...strongestPeriods.map((item) => item.slow_share_percent));

  return (
    <section aria-labelledby="wroclaw-insights-title" className="space-y-3">
      <div className="space-y-1">
        <h2 id="wroclaw-insights-title" className="text-xl font-semibold sm:text-2xl">Ruch drogowy we Wrocławiu w liczbach</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Podsumowanie zapisanych raportów z ulic monitorowanych przez eJedzie.pl. Obejmuje ostatnie 12 miesięcy.
        </p>
      </div>

      {isPending ? (
        <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">Wczytujemy miejskie statystyki…</p>
      ) : isError || !data ? (
        <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">Statystyki będą dostępne po ponownym wczytaniu danych.</p>
      ) : traffic?.report_count ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <Metric label="Zapisane raporty ruchu" value={traffic.report_count.toLocaleString("pl-PL")} note="ostatnie 12 miesięcy" />
            <Metric label="Raporty o spowolnieniu" value={`${traffic.slow_share_percent}%`} note={`${traffic.slow_report_count.toLocaleString("pl-PL")} z zapisanych odczytów`} />
            <Metric label="Zgłoszenia drogowe" value={incidents?.report_count_12_months.toLocaleString("pl-PL") ?? "0"} note={`${incidents?.report_count_30_days.toLocaleString("pl-PL") ?? "0"} w ostatnich 30 dniach`} />
            <Metric label="Monitorowane ulice" value={traffic.monitored_street_count.toLocaleString("pl-PL")} note="dane własne eJedzie.pl" />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4 text-primary" /> Pory dnia z częstszym spowolnieniem</CardTitle>
                <p className="text-xs leading-relaxed text-muted-foreground">Udział raportów z ruchem wolnym lub stojącym. Pokazujemy tylko przedziały z co najmniej 10 odczytami.</p>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-3 sm:p-5 sm:pt-3">
                {strongestPeriods.length ? strongestPeriods.map((item) => (
                  <div key={item.period}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{item.period}</span>
                      <span className="text-muted-foreground">{item.slow_share_percent}% · {item.sample_count.toLocaleString("pl-PL")} odczytów</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, (item.slow_share_percent / maxShare) * 100)}%` }} />
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Za mało odczytów do porównania pór dnia.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" /> Ulice z największym udziałem spowolnionych odczytów</CardTitle>
                <p className="text-xs leading-relaxed text-muted-foreground">Porównanie obejmuje tylko ulice z co najmniej 20 zapisanymi odczytami.</p>
              </CardHeader>
              <CardContent className="p-4 pt-3 sm:p-5 sm:pt-3">
                {busiestStreets.length ? (
                  <ol className="divide-y">
                    {busiestStreets.map((item, index) => (
                      <li key={item.street} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                        <span className="w-5 shrink-0 text-sm font-semibold text-muted-foreground">{index + 1}.</span>
                        {(() => {
                          const monitoredStreet = STREETS.find((street) => street.toLocaleLowerCase("pl-PL") === item.street.toLocaleLowerCase("pl-PL"));
                          return monitoredStreet ? (
                            <Link to={`/ulica/${streetToSlug(monitoredStreet)}/`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary hover:underline">{monitoredStreet}</Link>
                          ) : <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.street}</span>;
                        })()}
                        <span className="shrink-0 text-right text-sm font-semibold tabular-nums">{item.slow_share_percent}%<span className="block text-xs font-normal text-muted-foreground">{item.sample_count} odczytów</span></span>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-muted-foreground">Za mało odczytów, aby rzetelnie porównać ulice.</p>}
              </CardContent>
            </Card>
          </div>

          {incidents?.by_type?.length ? (
            <Card>
              <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><TriangleAlert className="h-4 w-4 text-amber-600" /> Zdarzenia i utrudnienia zgłaszane we Wrocławiu</CardTitle>
                <p className="text-xs text-muted-foreground">Zgłoszenia użytkowników eJedzie.pl z ostatnich 12 miesięcy.</p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 p-4 pt-3 sm:p-5 sm:pt-3">
                {incidents.by_type.slice(0, 6).map((item) => (
                  <span key={item.type} className="rounded-full border bg-background px-3 py-1.5 text-sm">
                    {INCIDENT_LABELS[item.type] ?? item.type}: <strong>{item.report_count}</strong>
                  </span>
                ))}
              </CardContent>
            </Card>
          ) : null}
          <p className="text-xs leading-relaxed text-muted-foreground">
            To statystyki zapisanych zgłoszeń, nie pełny pomiar wszystkich dróg Wrocławia ani prognoza. Liczba odczytów może
            być różna między ulicami.
          </p>
        </div>
      ) : (
        <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">Statystyki pojawią się, gdy w eJedzie.pl zostaną zapisane pierwsze raporty ruchu i zdarzeń.</p>
      )}
    </section>
  );
}
