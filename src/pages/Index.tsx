import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { WeeklyTimeline } from "@/components/WeeklyTimeline";
import { TodayTimeline } from "@/components/TodayTimeline";
import { Legend } from "@/components/Legend";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

const STREETS = [
  "Zwycięska",
  "Ołtaszyńska",
  "Karkonoska",
  "Ślężna",
  "Powstańców Śląskich",
  "Grabiszyńska",
  "Borowska",
  "Buforowa",
];

const STATUS_CONFIG = {
  stoi: {
    label: "🚦 stoi",
    color: "bg-traffic-stoi",
    textColor: "text-traffic-stoi-foreground",
  },
  toczy_sie: {
    label: "⚠️ toczy się",
    color: "bg-traffic-toczy",
    textColor: "text-traffic-toczy-foreground",
  },
  jedzie: {
    label: "🚗 jedzie",
    color: "bg-traffic-jedzie",
    textColor: "text-traffic-jedzie-foreground",
  },
};

interface Report {
  id: string;
  street: string;
  status: string;
  reported_at: string;
}

const Index = () => {
  const [selectedStreet, setSelectedStreet] = useState<string>("Zwycięska");
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [weeklyReports, setWeeklyReports] = useState<Report[]>([]);
  const [todayReports, setTodayReports] = useState<Report[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async (street: string) => {
    setIsLoading(true);
    try {
      // Fetch last 7 days of reports
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: weekData, error: weekError } = await supabase
        .from("traffic_reports")
        .select("*")
        .eq("street", street)
        .gte("reported_at", weekAgo.toISOString())
        .order("reported_at", { ascending: false });

      if (weekError) throw weekError;

      setWeeklyReports(weekData || []);

      // Fetch today's reports
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: todayData, error: todayError } = await supabase
        .from("traffic_reports")
        .select("*")
        .eq("street", street)
        .gte("reported_at", startOfDay.toISOString())
        .order("reported_at", { ascending: false });

      if (todayError) throw todayError;

      setTodayReports(todayData || []);

      // Calculate current status (last 60 minutes)
      const sixtyMinutesAgo = new Date();
      sixtyMinutesAgo.setMinutes(sixtyMinutesAgo.getMinutes() - 60);

      const recentReports = (todayData || []).filter(
        (r) => new Date(r.reported_at) >= sixtyMinutesAgo
      );

      if (recentReports.length > 0) {
        const statusCounts = recentReports.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const majorityStatus = Object.entries(statusCounts).sort(
          ([, a], [, b]) => b - a
        )[0][0];

        setCurrentStatus(majorityStatus);
      } else {
        setCurrentStatus(null);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Błąd podczas pobierania danych");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(selectedStreet);

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchReports(selectedStreet);
    }, 60000);

    // Subscribe to realtime updates
    const channel = supabase
      .channel("traffic-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "traffic_reports",
          filter: `street=eq.${selectedStreet}`,
        },
        () => {
          fetchReports(selectedStreet);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [selectedStreet]);

  const submitReport = async (status: string) => {
    try {
      // Generate a simple fingerprint (in production, use a more sophisticated method)
      const fingerprint = `user_${Math.random().toString(36).substring(7)}`;

      const { error } = await supabase.from("traffic_reports").insert({
        street: selectedStreet,
        status,
        user_fingerprint: fingerprint,
      });

      if (error) throw error;

      toast.success("Dziękujemy za zgłoszenie!");
      
      // Optimistic update
      fetchReports(selectedStreet);
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Błąd podczas wysyłania zgłoszenia");
    }
  };

  const statusConfig = currentStatus
    ? STATUS_CONFIG[currentStatus as keyof typeof STATUS_CONFIG]
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-center mb-3">
            Czy {selectedStreet} stoi?
          </h1>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Wybierz ulicę</label>
            <Select value={selectedStreet} onValueChange={setSelectedStreet}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STREETS.map((street) => (
                  <SelectItem key={street} value={street}>
                    {street}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Current Status */}
        <section
          className={`rounded-lg p-6 text-center transition-colors ${
            statusConfig ? statusConfig.color : "bg-muted"
          }`}
        >
          {isLoading ? (
            <p className="text-lg font-semibold">Ładowanie...</p>
          ) : statusConfig ? (
            <>
              <h2
                className={`text-3xl font-bold mb-2 ${statusConfig.textColor}`}
              >
                {selectedStreet} {statusConfig.label}
              </h2>
              <p
                className={`text-sm ${statusConfig.textColor} opacity-90`}
              >
                Stan aktualizowany na podstawie zgłoszeń użytkowników.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2 text-muted-foreground">
                Brak aktualnych danych
              </h2>
              <p className="text-sm text-muted-foreground">
                Bądź pierwszy! Zgłoś aktualny stan ruchu poniżej.
              </p>
            </>
          )}
        </section>

        {/* Report Buttons */}
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-center">
            Jak wygląda teraz ruch?
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={() => submitReport("stoi")}
              className="h-16 bg-traffic-stoi hover:bg-traffic-stoi/90 text-traffic-stoi-foreground flex flex-col gap-1"
            >
              <span className="text-xl">🛑</span>
              <span className="text-xs font-medium">Stoi</span>
            </Button>
            <Button
              onClick={() => submitReport("toczy_sie")}
              className="h-16 bg-traffic-toczy hover:bg-traffic-toczy/90 text-traffic-toczy-foreground flex flex-col gap-1"
            >
              <span className="text-xl">⚠️</span>
              <span className="text-xs font-medium">Toczy się</span>
            </Button>
            <Button
              onClick={() => submitReport("jedzie")}
              className="h-16 bg-traffic-jedzie hover:bg-traffic-jedzie/90 text-traffic-jedzie-foreground flex flex-col gap-1"
            >
              <span className="text-xl">🚗</span>
              <span className="text-xs font-medium">Jedzie</span>
            </Button>
          </div>
        </section>

        {/* Today's Timeline */}
        <section className="bg-card rounded-lg p-5 border border-border">
          <TodayTimeline reports={todayReports} street={selectedStreet} />
        </section>

        {/* Weekly Timeline */}
        <section className="bg-card rounded-lg p-5 border border-border">
          <WeeklyTimeline reports={weeklyReports} />
        </section>

        {/* Legend */}
        <section className="bg-card rounded-lg p-5 border border-border">
          <Legend />
        </section>

        {/* Use Cases */}
        <section className="bg-card rounded-lg p-6 border border-border space-y-4">
          <h3 className="text-lg font-semibold text-center mb-4">
            Jak korzystać z serwisu?
          </h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Dodaj info o korkach, informuj sąsiadów</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Zobacz czy jest korek, by zdecydować, kiedy pojechać na zakupy</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Zobacz czy ulica rano już stoi, by wyjechać wcześniej</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Spójrz, które godziny będą lepsze do wyjazdu i powrotu z miasta</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Zaplanuj lepsze godziny wyjazdu do pracy lub na basen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Łączmy się w bólu i uśmiechu</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Bądźmy dla siebie mili i uprzejmi</span>
            </li>
          </ul>
          <Button
            onClick={async () => {
              const url = window.location.href;
              const title = "Czy stoi?";
              const text = "Zobacz aktualny stan ruchu na Twojej ulicy!";
              
              if (navigator.share) {
                try {
                  await navigator.share({ title, text, url });
                  toast.success("Dziękujemy za udostępnienie!");
                } catch (error) {
                  if ((error as Error).name !== "AbortError") {
                    console.error("Error sharing:", error);
                  }
                }
              } else {
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success("Link skopiowany do schowka!");
                } catch (error) {
                  console.error("Error copying to clipboard:", error);
                  toast.error("Nie można skopiować linku");
                }
              }
            }}
            className="w-full"
            variant="outline"
          >
            Udostępnij znajomemu
          </Button>
        </section>
      </main>

      {/* Footer */}
      <footer className="container max-w-2xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        Dane społecznościowe. Ostatnia aktualizacja:{" "}
        {format(lastUpdate, "dd.MM.yyyy, HH:mm", { locale: pl })}
      </footer>
    </div>
  );
};

export default Index;