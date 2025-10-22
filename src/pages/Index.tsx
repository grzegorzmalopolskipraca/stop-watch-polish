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
import { StreetChat } from "@/components/StreetChat";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  "Grota Roweckiego",
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
  const [lastTenStats, setLastTenStats] = useState<Record<string, number>>({});
  const [direction, setDirection] = useState<string>(() => {
    const currentHour = new Date().getHours();
    return currentHour < 13 ? "to_center" : "from_center";
  });
  const [todayVisitors, setTodayVisitors] = useState<number>(0);
  const [totalVisitors, setTotalVisitors] = useState<number>(0);
  const [incidentCounts, setIncidentCounts] = useState<Record<string, number>>({});

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
        .eq("direction", direction)
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
        .eq("direction", direction)
        .gte("reported_at", startOfDay.toISOString())
        .order("reported_at", { ascending: false });

      if (todayError) throw todayError;

      setTodayReports(todayData || []);

      // Calculate stats for last 10 reports
      const lastTen = (todayData || []).slice(0, 10);
      const stats = lastTen.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      setLastTenStats(stats);

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

  const fetchVisitorStats = async () => {
    try {
      // Fetch today's visitors count
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count: todayCount } = await supabase
        .from("page_visits")
        .select("*", { count: "exact", head: true })
        .gte("visited_at", startOfDay.toISOString());

      // Fetch total visitors count
      const { count: totalCount } = await supabase
        .from("page_visits")
        .select("*", { count: "exact", head: true });

      setTodayVisitors(todayCount || 0);
      setTotalVisitors(totalCount || 0);
    } catch (error) {
      console.error("Error fetching visitor stats:", error);
    }
  };

  const fetchIncidentCounts = async () => {
    try {
      const twentyMinutesAgo = new Date();
      twentyMinutesAgo.setMinutes(twentyMinutesAgo.getMinutes() - 20);

      const { data, error } = await supabase
        .from("incident_reports")
        .select("incident_type")
        .eq("street", selectedStreet)
        .eq("direction", direction)
        .gte("reported_at", twentyMinutesAgo.toISOString());

      if (error) throw error;

      const counts = (data || []).reduce((acc, r) => {
        acc[r.incident_type] = (acc[r.incident_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setIncidentCounts(counts);
    } catch (error) {
      console.error("Error fetching incident counts:", error);
    }
  };

  const recordVisit = async () => {
    try {
      let userFingerprint = localStorage.getItem('userFingerprint');
      if (!userFingerprint) {
        userFingerprint = `user_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
        localStorage.setItem('userFingerprint', userFingerprint);
      }

      await supabase.functions.invoke('record-visit', {
        body: {
          userFingerprint,
          street: selectedStreet,
        },
      });

      // Fetch updated stats after recording visit
      fetchVisitorStats();
    } catch (error) {
      console.error("Error recording visit:", error);
    }
  };

  useEffect(() => {
    fetchReports(selectedStreet);
    fetchVisitorStats();
    fetchIncidentCounts();
    recordVisit();

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchReports(selectedStreet);
      fetchVisitorStats();
      fetchIncidentCounts();
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
  }, [selectedStreet, direction]);

  const submitReport = async (status: string) => {
    try {
      // Get or create persistent user fingerprint
      let userFingerprint = localStorage.getItem('userFingerprint');
      if (!userFingerprint) {
        userFingerprint = `user_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
        localStorage.setItem('userFingerprint', userFingerprint);
      }
      
      const { data, error } = await supabase.functions.invoke('submit-traffic-report', {
        body: {
          street: selectedStreet,
          status,
          userFingerprint,
          direction,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to submit report');
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Dziękujemy za zgłoszenie!");
      fetchReports(selectedStreet);
    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast.error(error.message || "Błąd podczas wysyłania zgłoszenia");
    }
  };

  const submitIncidentReport = async (incidentType: string) => {
    try {
      let userFingerprint = localStorage.getItem('userFingerprint');
      if (!userFingerprint) {
        userFingerprint = `user_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
        localStorage.setItem('userFingerprint', userFingerprint);
      }

      const { data, error } = await supabase.functions.invoke('submit-incident-report', {
        body: {
          street: selectedStreet,
          incidentType,
          userFingerprint,
          direction,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to submit incident report');
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Zgłoszenie zapisane!");
      fetchIncidentCounts();
    } catch (error: any) {
      console.error("Error submitting incident report:", error);
      toast.error(error.message || "Błąd podczas wysyłania zgłoszenia");
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
          <div className="flex items-center justify-between gap-4 mb-3">
            <a href="https://ejedzie.pl" className="block">
              <h1 className="text-2xl font-bold hover:text-primary transition-colors cursor-pointer">
                Czy {selectedStreet} stoi?
              </h1>
            </a>
            <a 
              href="https://ejedzie.pl" 
              className="text-lg font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
            >
              ejedzie.pl
            </a>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Wybierz ulicę w Wrocławiu</label>
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
        {/* Direction Toggle */}
        <section>
          <Tabs value={direction} onValueChange={setDirection} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-muted">
              <TabsTrigger 
                value="to_center" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:shadow-md"
              >
                Do centrum
              </TabsTrigger>
              <TabsTrigger 
                value="from_center"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:shadow-md"
              >
                Od centrum
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </section>

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
                Stan aktualizowany na podstawie zgłoszeń mieszkańców.
              </p>
              {Object.keys(lastTenStats).length > 0 && (
                <p className={`text-xs mt-2 ${statusConfig.textColor} opacity-80`}>
                  {lastTenStats.stoi && `Stoi: ${lastTenStats.stoi}`}
                  {lastTenStats.toczy_sie && ` Toczy się: ${lastTenStats.toczy_sie}`}
                  {lastTenStats.jedzie && ` Jedzie: ${lastTenStats.jedzie}`}
                </p>
              )}
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

        {/* Last Update Info */}
        <section className="text-center text-sm text-muted-foreground space-y-1">
          <p>
            Dane społecznościowe. Ostatnia aktualizacja:{" "}
            {format(lastUpdate, "dd.MM.yyyy, HH:mm", { locale: pl })}
          </p>
          <p>
            Dzisiaj odwiedziło nas: <strong>{todayVisitors}</strong> osób
          </p>
          <p>
            Łącznie: <strong>{totalVisitors}</strong> wizyt
          </p>
        </section>

        {/* Incident Reports */}
        <section className="bg-card rounded-lg p-5 border border-border space-y-4">
          <h3 className="text-lg font-semibold text-center">
            Zgłoś zdarzenie na drodze
          </h3>
          <p className="text-sm text-muted-foreground text-center">
            Licznik pokazuje zgłoszenia z ostatnich 20 minut
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { type: "Blokada", emoji: "🚧" },
              { type: "Wypadek", emoji: "🚨" },
              { type: "Objazd", emoji: "↪️" },
              { type: "Roboty", emoji: "🚜" },
              { type: "Ślisko", emoji: "❄️" },
              { type: "Dziury", emoji: "🕳️" },
              { type: "Zwierze", emoji: "🦌" },
            ].map((incident) => (
              <Button
                key={incident.type}
                onClick={() => submitIncidentReport(incident.type)}
                variant="outline"
                className="h-20 flex flex-col gap-1 text-xs"
              >
                <span className="text-xl font-bold text-primary">
                  {incidentCounts[incident.type] || 0}
                </span>
                <span className="text-lg">{incident.emoji}</span>
                <span className="font-medium">{incident.type}</span>
              </Button>
            ))}
          </div>
        </section>

        {/* Weekly Timeline */}
        <section className="bg-card rounded-lg p-5 border border-border">
          <WeeklyTimeline reports={weeklyReports} />
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
              const url = "https://ejedzie.pl";
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

        {/* Street Chat */}
        <section>
          <StreetChat street={selectedStreet} />
        </section>
      </main>

      {/* Footer */}
      <footer className="container max-w-2xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        <p>
          Ulepszenia i sugestie: kontakt @ ejedzie.pl
        </p>
      </footer>
    </div>
  );
};

export default Index;