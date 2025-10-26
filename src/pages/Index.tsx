import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { WeeklyTimeline } from "@/components/WeeklyTimeline";
import { TodayTimeline } from "@/components/TodayTimeline";
import { Legend } from "@/components/Legend";
import { StreetChat } from "@/components/StreetChat";
import { StreetVoting } from "@/components/StreetVoting";
import { CityVoting } from "@/components/CityVoting";
import { TrafficLine } from "@/components/TrafficLine";
import { GreenWave } from "@/components/GreenWave";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { ArrowUp, ArrowDown, Bell, BellOff, ThumbsUp, Coffee, Pizza, Download } from "lucide-react";
import { subscribeToWonderPush, unsubscribeFromWonderPush, isWonderPushSubscribed } from "@/utils/wonderpush";

const STREETS = [
  "Borowska",
  "Buforowa",
  "Grabiszyńska",
  "Grota Roweckiego",
  "Karkonoska",
  "Ołtaszyńska",
  "Opolska",
  "Parafialna",
  "Powstańców Śląskich",
  "Radosna",
  "Sudecka",
  "Ślężna",
  "Zwycięska",
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
  const [selectedStreet, setSelectedStreet] = useState<string>(() => {
    const savedStreet = localStorage.getItem('selectedStreet');
    return savedStreet && STREETS.includes(savedStreet) ? savedStreet : "Zwycięska";
  });
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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showDonationDialog, setShowDonationDialog] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pendingIncident, setPendingIncident] = useState<{type: string; emoji: string} | null>(null);
  const [trafficTrend, setTrafficTrend] = useState<string | null>(null);
  const [incidentNotificationsEnabled, setIncidentNotificationsEnabled] = useState(false);

  // Save selected street to localStorage
  useEffect(() => {
    localStorage.setItem('selectedStreet', selectedStreet);
    // Load incident notification preference when street changes
    setIncidentNotificationsEnabled(isWonderPushSubscribed(`incidents_${selectedStreet}`));
  }, [selectedStreet]);

  // Capture the install prompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const detectPlatform = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
    const isChrome = /chrome/.test(userAgent) && !/edge/.test(userAgent);
    const isFirefox = /firefox/.test(userAgent);
    const isEdge = /edge/.test(userAgent);
    const isMobile = isIOS || isAndroid;
    
    return { isIOS, isAndroid, isSafari, isChrome, isFirefox, isEdge, isMobile };
  };

  const handleInstallClick = async () => {
    const platform = detectPlatform();
    
    // For Chrome/Edge with install prompt support
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success("Dziękujemy za dodanie skrótu!");
      }
      
      setDeferredPrompt(null);
      return;
    }
    
    // For iOS Safari or other browsers without install prompt
    if (platform.isIOS && platform.isSafari) {
      setShowInstallDialog(true);
      return;
    }
    
    // For other platforms/browsers
    if (platform.isMobile) {
      setShowInstallDialog(true);
    } else {
      // Desktop browsers
      setShowInstallDialog(true);
    }
  };

  const getInstallInstructions = () => {
    const platform = detectPlatform();
    
    if (platform.isIOS && platform.isSafari) {
      return (
        <div className="space-y-3 text-sm">
          <p className="font-semibold">Aby dodać aplikację na iPhone/iPad:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Kliknij przycisk "Udostępnij" <span className="inline-block">📤</span> na dole ekranu</li>
            <li>Przewiń w dół i wybierz "Dodaj do ekranu początkowego"</li>
            <li>Kliknij "Dodaj" w prawym górnym rogu</li>
          </ol>
        </div>
      );
    }
    
    if (platform.isAndroid) {
      if (platform.isChrome) {
        return (
          <div className="space-y-3 text-sm">
            <p className="font-semibold">Aby dodać aplikację na Androida (Chrome):</p>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Kliknij menu (trzy kropki) w prawym górnym rogu</li>
              <li>Wybierz "Dodaj do ekranu głównego"</li>
              <li>Potwierdź przyciskiem "Dodaj"</li>
            </ol>
          </div>
        );
      } else if (platform.isFirefox) {
        return (
          <div className="space-y-3 text-sm">
            <p className="font-semibold">Aby dodać aplikację na Androida (Firefox):</p>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Kliknij menu (trzy kropki) w prawym górnym rogu</li>
              <li>Wybierz "Zainstaluj"</li>
              <li>Potwierdź instalację</li>
            </ol>
          </div>
        );
      }
    }
    
    // Desktop instructions
    if (platform.isChrome || platform.isEdge) {
      return (
        <div className="space-y-3 text-sm">
          <p className="font-semibold">Aby dodać aplikację na komputerze:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Kliknij ikonę instalacji <span className="inline-block">⊕</span> w pasku adresu</li>
            <li>Lub kliknij menu (trzy kropki) → "Zainstaluj eJedzie.pl"</li>
            <li>Potwierdź instalację</li>
          </ol>
        </div>
      );
    }
    
    // Fallback for other browsers
    return (
      <div className="space-y-3 text-sm">
        <p className="font-semibold">Aby dodać aplikację:</p>
        <p>Dodaj tę stronę do zakładek lub użyj funkcji "Dodaj do ekranu głównego" dostępnej w menu przeglądarki.</p>
      </div>
    );
  };

  const fetchReports = async (street: string) => {
    setIsLoading(true);
    try {
      // Fetch last 7 days of reports for weekly timeline
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

      // Fetch today's reports for today timeline
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

      // Helper function to get status counts for a time window
      const getStatusCounts = async (minutesAgo: number) => {
        const timeAgo = new Date();
        timeAgo.setMinutes(timeAgo.getMinutes() - minutesAgo);
        
        const { data, error } = await supabase
          .from('traffic_reports')
          .select('*')
          .eq('street', street)
          .eq('direction', direction)
          .gte('reported_at', timeAgo.toISOString());

        if (error) throw error;

        const stoiCount = data?.filter(r => r.status === 'stoi').length || 0;
        const toczyCount = data?.filter(r => r.status === 'toczy_sie').length || 0;
        const jedzieCount = data?.filter(r => r.status === 'jedzie').length || 0;
        const total = stoiCount + toczyCount + jedzieCount;

        return { stoiCount, toczyCount, jedzieCount, total, data };
      };

      // Try 20 minutes first
      let result = await getStatusCounts(20);
      
      // If no data, try 30 minutes
      if (result.total === 0) {
        result = await getStatusCounts(30);
      }
      
      // If still no data, try 60 minutes
      if (result.total === 0) {
        result = await getStatusCounts(60);
      }

      // Set stats for the last time window that had data
      const stats: Record<string, number> = {};
      if (result.total > 0) {
        if (result.stoiCount > 0) stats['stoi'] = result.stoiCount;
        if (result.toczyCount > 0) stats['toczy_sie'] = result.toczyCount;
        if (result.jedzieCount > 0) stats['jedzie'] = result.jedzieCount;
      }
      setLastTenStats(stats);

      // Determine current status based on highest count
      if (result.total > 0) {
        const { stoiCount, toczyCount, jedzieCount } = result;
        const maxCount = Math.max(stoiCount, toczyCount, jedzieCount);
        
        let determinedStatus: string;
        if (stoiCount === maxCount) {
          determinedStatus = 'stoi';
        } else if (jedzieCount === maxCount) {
          determinedStatus = 'jedzie';
        } else {
          determinedStatus = 'toczy_sie';
        }
        
        setCurrentStatus(determinedStatus);
      } else {
        // No data in any time window
        setCurrentStatus(null);
      }

      // Calculate traffic trend based on last two reports
      const { data: lastTwoReports, error: trendError } = await supabase
        .from('traffic_reports')
        .select('status')
        .eq('street', street)
        .eq('direction', direction)
        .order('reported_at', { ascending: false })
        .limit(2);

      if (!trendError && lastTwoReports && lastTwoReports.length === 2) {
        const lastStatus = lastTwoReports[0].status;
        const previousStatus = lastTwoReports[1].status;
        
        // Status hierarchy: jedzie > toczy_sie > stoi
        const statusLevels: Record<string, number> = {
          'jedzie': 3,
          'toczy_sie': 2,
          'stoi': 1
        };
        
        const lastLevel = statusLevels[lastStatus] || 0;
        const previousLevel = statusLevels[previousStatus] || 0;
        
        if (lastLevel > previousLevel) {
          setTrafficTrend("Ruch przyspiesza");
        } else if (lastLevel < previousLevel) {
          setTrafficTrend("Ruch zwalnia");
        } else {
          setTrafficTrend(null);
        }
      } else {
        setTrafficTrend(null);
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
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's visitor count
      const { data: todayData } = await supabase
        .from("daily_visit_stats")
        .select("visit_count")
        .eq("visit_date", today)
        .maybeSingle();

      // Fetch total visitors count from single record
      const { data: totalData } = await supabase
        .from("total_visit_counter")
        .select("total_visits")
        .limit(1)
        .maybeSingle();

      setTodayVisitors(todayData?.visit_count || 0);
      setTotalVisitors(totalData?.total_visits || 0);
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
      // Wait a bit for database to commit, then refresh
      setTimeout(() => {
        fetchReports(selectedStreet);
        fetchIncidentCounts();
      }, 500);
    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast.error(error.message || "Błąd podczas wysyłania zgłoszenia");
    }
  };

  const handleIncidentNotifications = async () => {
    if (!("Notification" in window)) {
      toast.error("Twoja przeglądarka nie obsługuje powiadomień");
      return;
    }

    if (incidentNotificationsEnabled) {
      // Unsubscribe
      const success = await unsubscribeFromWonderPush(`incidents_${selectedStreet}`);
      if (success) {
        setIncidentNotificationsEnabled(false);
        toast.success("Powiadomienia o zdarzeniach wyłączone");
      } else {
        toast.error("Błąd podczas wyłączania powiadomień");
      }
    } else {
      // Subscribe
      const success = await subscribeToWonderPush(`incidents_${selectedStreet}`);
      if (success) {
        setIncidentNotificationsEnabled(true);
        toast.success("Powiadomienia o zdarzeniach włączone");
      } else {
        toast.error("Nie udało się włączyć powiadomień. Sprawdź ustawienia przeglądarki.");
      }
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
        // Show rate limit message to user
        if (data.error === 'rate_limit') {
          toast.error(data.message || 'Maks 1 zgłoszenie na 5 minute');
          return;
        }
        toast.error(data.message || data.error);
        return;
      }

      toast.success("Zgłoszenie zapisane!");
      fetchIncidentCounts();
    } catch (error: any) {
      console.error("Error submitting incident report:", error);
      toast.error(error.message || "Błąd podczas wysyłania zgłoszenia");
    }
  };

  const handleDonationPayment = async (amount: number) => {
    setIsProcessingPayment(true);
    try {
      const priceIds: Record<number, string> = {
        5: 'price_1SLCZ52ZgeTNci3vXb9RPYCl',
        10: 'price_1SLCZI2ZgeTNci3vMyBwkWwz',
        50: 'price_1SLCZU2ZgeTNci3vqaOou3lL',
      };

      const { data, error } = await supabase.functions.invoke('create-donation-payment', {
        body: { priceId: priceIds[amount] },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create payment session');
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        setShowDonationDialog(false);
        toast.success("Dziękujemy za wsparcie!");
      }
    } catch (error: any) {
      console.error("Error creating payment:", error);
      toast.error(error.message || "Błąd podczas tworzenia płatności");
    } finally {
      setIsProcessingPayment(false);
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
          <div className="mb-3">
            <p className="text-sm text-muted-foreground mb-1">Zanim wyjedziesz sprawdź</p>
            <a href="https://ejedzie.pl" className="block">
              <h1 className="text-2xl font-bold hover:text-primary transition-colors cursor-pointer">
                Czy {selectedStreet} stoi?
              </h1>
            </a>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Wybierz ulicę w Wrocławiu</label>
              <div className="flex flex-col items-end -mt-1">
                <a 
                  href="https://ejedzie.pl" 
                  className="text-base font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap leading-tight"
                >
                  e<span className="text-green-600">J</span>edzie.pl
                </a>
                
              </div>
            </div>
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
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:shadow-md flex items-center gap-2"
              >
                <ArrowUp className="w-4 h-4" />
                Do centrum
              </TabsTrigger>
              <TabsTrigger 
                value="from_center"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:shadow-md flex items-center gap-2"
              >
                <ArrowDown className="w-4 h-4" />
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
                Informacje na żywo na podstawie zgłoszeń mieszkańców.
              </p>
              {Object.keys(lastTenStats).length > 0 && (
                <>
                  <p className={`text-xs mt-2 ${statusConfig.textColor} opacity-80`}>
                    {lastTenStats.stoi && `Stoi: ${lastTenStats.stoi}`}
                    {lastTenStats.toczy_sie && ` Toczy się: ${lastTenStats.toczy_sie}`}
                    {lastTenStats.jedzie && ` Jedzie: ${lastTenStats.jedzie}`}
                  </p>
                  {Object.entries(incidentCounts).map(([incidentType, count]) => {
                    if (count > 3) {
                      return (
                        <p key={incidentType} className={`text-sm mt-3 font-semibold ${statusConfig.textColor} bg-destructive/20 rounded px-3 py-2`}>
                          ⚠️ Uwaga! {count} razy zgłoszono '{incidentType}' na drodze
                        </p>
                      );
                    }
                    return null;
                  })}
                  {trafficTrend && (
                    <p className={`text-sm mt-3 font-semibold ${statusConfig.textColor}`}>
                      {trafficTrend}
                    </p>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2 text-muted-foreground">
                Brak aktualnych zgłoszeń, ulica przejezdna lub jeszcze mało zgłoszeń. Zaproś sąsiadów.
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
        <section className="bg-card rounded-lg p-5 border border-border space-y-4">
          <TodayTimeline reports={todayReports} street={selectedStreet} />
          <TrafficLine street={selectedStreet} direction={direction as "to_center" | "from_center"} />
        </section>

        {/* Last Update Info */}
        <section className="text-center text-sm text-muted-foreground space-y-1">
          <p>
            Dane społecznościowe. Aktualizacja z:{" "}
            {format(lastUpdate, "dd.MM.yyyy, HH:mm", { locale: pl })}
          </p>
          <p>
            Dzisiaj odwiedziło nas: <strong>{todayVisitors}</strong> osób
          </p>
          <p>
            Petycja: Drogi Wrocławiu, <strong>{totalVisitors}</strong> osób sprawdzało, czy są korki. Pomóż nam redukować korki
          </p>
        </section>

        {/* Incident Reports */}
        <section className="bg-card rounded-lg p-5 border border-border space-y-4">
          <h3 className="text-lg font-semibold text-center">
            Zgłoś zdarzenie na drodze
          </h3>
          <p className="text-sm text-muted-foreground text-center">
            Licznik pokazuje ile osób potwierdziło zgłoszenie
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
              { type: "Awaria", emoji: "🚦" },
            ].map((incident) => (
              <Button
                key={incident.type}
                onClick={() => setPendingIncident(incident)}
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

        {/* Green Wave */}
        <section className="bg-card rounded-lg p-5 border border-border">
          <GreenWave reports={weeklyReports} />
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
          
          <Button
            onClick={handleInstallClick}
            className="w-full"
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            Dodaj skrót na pulpit
          </Button>
        </section>

        {/* Street Chat */}
        <section>
          <StreetChat street={selectedStreet} />
        </section>

        {/* Chat Use Cases */}
        <section className="bg-card rounded-lg p-4 border border-border space-y-3">
          <h3 className="text-lg font-semibold text-center">
            Przykłady wiadomości na czacie
          </h3>
          <div className="relative h-64 overflow-hidden">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes scroll-messages {
                0% { transform: translateY(0); }
                100% { transform: translateY(-50%); }
              }
              .animate-scroll {
                animation: scroll-messages 30s linear infinite;
              }
              .animate-scroll:hover {
                animation-play-state: paused;
              }
            `}} />
            <div className="animate-scroll">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Potrzebuję transportu na ulicę X Jestem koło Y Zapłacę, bo spieszy mi się"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Szukam na tej ulicy obiektu X, jak tu wjechać?"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Podwiozę do Galerii Dominikańskiej osobę w wieku X"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Potrzebuję pomocy z samochodem / motocyklem!"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Nie mogę odpalić samochodu, ma ktoś prostownik?"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Ktoś mnie zablokował przy Zwycięskiej X, proszę o szybki kontakt"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Uważajcie na tą osobę, może wejść na drogę"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Uwaga, na drodze leży gwóźdź, omijajcie go koło X"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Ile czasu zajęło Wam przejechanie korka od adresu X do Adresu Y?"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Jest blokada, drogę należy objechać przez ulicę X, Y, Z"</span>
                </li>
              </ul>
              {/* Duplicate for seamless loop */}
              <ul className="space-y-2 text-sm mt-2">
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Potrzebuję transportu na ulicę X Jestem koło Y Zapłacę, bo spieszy mi się"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Szukam na tej ulicy obiektu X, jak tu wjechać?"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Podwiozę do Galerii Dominikańskiej osobę w wieku X"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Potrzebuję pomocy z samochodem / motocyklem!"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Nie mogę odpalić samochodu, ma ktoś prostownik?"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Ktoś mnie zablokował przy Zwycięskiej X, proszę o szybki kontakt"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Uważajcie na tą osobę, może wejść na drogę"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Uwaga, na drodze leży gwóźdź, omijajcie go koło X"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Ile czasu zajęło Wam przejechanie korka od adresu X do Adresu Y?"</span>
                </li>
                <li className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <span className="text-primary mt-0.5">💬</span>
                  <span className="italic">"Jest blokada, drogę należy objechać przez ulicę X, Y, Z"</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Street Voting */}
        <section>
          <StreetVoting existingStreets={STREETS} />
        </section>

        {/* City Voting */}
        <section className="hidden">
          <CityVoting />
        </section>
      </main>

      {/* Footer */}
      <footer className="container max-w-2xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground space-y-3">
        {/* Support Section */}
        <div className="bg-card rounded-lg p-6 border border-border space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-foreground">
            Fajny pomysł, rozwijajmy go
          </h3>
          <div className="flex justify-center items-center gap-6 py-4">
            <ThumbsUp className="w-12 h-12 text-primary" />
            <Coffee className="w-12 h-12 text-primary" />
            <Pizza className="w-12 h-12 text-primary" />
          </div>
          <Button
            onClick={() => window.open('https://suppi.pl/ejedzie', '_blank')}
            className="w-full h-14 text-lg font-bold"
            size="lg"
          >
            Wspieram rozwój strony
          </Button>
        </div>

        <p>
          Ulepszenia i sugestie piszcie na: grzegorzmalopolskipraca@gmail.com
        </p>
        <p className="text-xs mt-2">
          <a 
            href="/plakat-promocyjny.png" 
            download="eJedzie-plakat.png"
            className="text-primary hover:underline"
          >
            Chcesz pomóc promować ten portal wśród sąsiadów? Wydrukuj tą kartkę i umieść ją za szybą.
          </a>
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 mt-6 pt-4 border-t border-border">
          <Link to="/o-projekcie" className="text-sm text-primary hover:underline">
            O projekcie
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link to="/regulamin" className="text-sm text-primary hover:underline">
            Regulamin i polityka prywatności
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link to="/kontakt" className="text-sm text-primary hover:underline">
            Kontakt
          </Link>
        </div>
      </footer>
      
      {/* Install Dialog */}
      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj eJedzie.pl na pulpit</DialogTitle>
            <DialogDescription>
              Zainstaluj aplikację, aby mieć szybki dostęp i móc korzystać z niej offline.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {getInstallInstructions()}
          </div>
          <Button onClick={() => setShowInstallDialog(false)} className="mt-4 w-full">
            Rozumiem
          </Button>
        </DialogContent>
      </Dialog>

      {/* Donation Dialog */}
      <Dialog open={showDonationDialog} onOpenChange={setShowDonationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wesprzyj eJedzie.pl</DialogTitle>
            <DialogDescription>
              Wybierz kwotę wsparcia. Dziękujemy za każdą pomoc!
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 mt-4">
            <Button
              onClick={() => handleDonationPayment(5)}
              disabled={isProcessingPayment}
              className="h-16 text-lg"
              variant="outline"
            >
              ☕ 5 zł - Mała kawa
            </Button>
            <Button
              onClick={() => handleDonationPayment(10)}
              disabled={isProcessingPayment}
              className="h-16 text-lg"
              variant="outline"
            >
              ☕☕ 10 zł - Duża kawa
            </Button>
            <Button
              onClick={() => handleDonationPayment(50)}
              disabled={isProcessingPayment}
              className="h-16 text-lg"
              variant="outline"
            >
              ☕☕☕ 50 zł - Wspaniałomyślne wsparcie
            </Button>
          </div>
          <Button 
            onClick={() => setShowDonationDialog(false)} 
            className="mt-4 w-full"
            variant="ghost"
          >
            Anuluj
          </Button>
        </DialogContent>
      </Dialog>

      {/* Incident Confirmation Dialog */}
      <AlertDialog open={!!pendingIncident} onOpenChange={(open) => !open && setPendingIncident(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy chcesz zgłosić zdarzenie?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Upewniam się, że nie kliknąłeś przypadkiem
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingIncident) {
                  submitIncidentReport(pendingIncident.type);
                  setPendingIncident(null);
                }
              }}
            >
              Zgłoś
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;