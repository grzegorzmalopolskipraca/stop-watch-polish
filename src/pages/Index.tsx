import { useState, useEffect, useMemo, useRef } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
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
import { PredictedTraffic } from "@/components/PredictedTraffic";
import { ExtendedPredictedTraffic } from "@/components/ExtendedPredictedTraffic";
import { StreetChat } from "@/components/StreetChat";
import { StreetVoting } from "@/components/StreetVoting";
import { CityVoting } from "@/components/CityVoting";
import { CarpoolingVoting } from "@/components/CarpoolingVoting";
import { TrafficLine } from "@/components/TrafficLine";
import { GreenWave } from "@/components/GreenWave";
import { RssTicker } from "@/components/RssTicker";
import { SmsSubscription } from "@/components/SmsSubscription";
import { WeatherForecast } from "@/components/WeatherForecast";
import { CommuteOptimizer } from "@/components/CommuteOptimizer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfDay, addMinutes } from "date-fns";
import { pl } from "date-fns/locale";
import { ArrowUp, ArrowDown, Bell, BellOff, ThumbsUp, Coffee, Pizza, Download, Share2, Printer, Users, Baby, Calendar, Activity, AlertTriangle, Bike, MessageSquare, HelpCircle } from "lucide-react";
import { subscribeToOneSignal, unsubscribeFromOneSignal, isOneSignalSubscribed } from "@/utils/onesignal";
import { predictTrafficIntervals, groupIntervalsIntoRanges } from "@/utils/trafficPrediction";

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
  direction: string;
}

const Index = () => {
  const [selectedStreet, setSelectedStreet] = useState<string>(() => {
    const savedStreet = localStorage.getItem('selectedStreet');
    return savedStreet && STREETS.includes(savedStreet) ? savedStreet : "Zwycięska";
  });
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [weeklyReports, setWeeklyReports] = useState<Report[]>([]);
  const [commuteReports, setCommuteReports] = useState<Report[]>([]);
  const [todayReports, setTodayReports] = useState<Report[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [lastTenStats, setLastTenStats] = useState<Record<string, number>>({});
  const [direction, setDirection] = useState<string>(() => {
    const currentHour = new Date().getHours();
    return currentHour < 13 ? "to_center" : "from_center";
  });
  const [todayVisitors, setTodayVisitors] = useState<number>(0);
  const [showRssTicker, setShowRssTicker] = useState(false);
  const [totalVisitors, setTotalVisitors] = useState<number>(0);
  const [incidentCounts, setIncidentCounts] = useState<Record<string, number>>({});
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showDonationDialog, setShowDonationDialog] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pendingIncident, setPendingIncident] = useState<{type: string; emoji: string} | null>(null);
  const [incidentMessage, setIncidentMessage] = useState("");
  const [trafficTrend, setTrafficTrend] = useState<string | null>(null);
  const [incidentNotificationsEnabled, setIncidentNotificationsEnabled] = useState(false);
  const [statusNotificationsEnabled, setStatusNotificationsEnabled] = useState(false);
  const [latestSpeed, setLatestSpeed] = useState<number | null>(null);
  const [lastKnownSpeed, setLastKnownSpeed] = useState<number | null>(null); // Persists for manual submissions
  const currentSpeedRef = useRef<number | null>(null); // Ref to always have latest speed for button clicks
  const [todayMinSpeed, setTodayMinSpeed] = useState<Record<string, number>>({});
  const [todayMaxSpeed, setTodayMaxSpeed] = useState<Record<string, number>>({});
  const [streetDistance, setStreetDistance] = useState<number | null>(null);
  const [couponReward, setCouponReward] = useState<{
    id: string;
    local_name: string;
    discount: number;
    location_street: string | null;
    image_link: string | null;
  } | null>(null);
  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const [activeIncidents, setActiveIncidents] = useState<string[]>([]);

  // Format duration helper function
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minut`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return hours === 1 ? '1 godzina' : `${hours} godziny`;
    }
    
    return `${hours} ${hours === 1 ? 'godzina' : 'godziny'} ${remainingMinutes} minut`;
  };

  // Calculate next slots matching the extended 10-hour forecast view
  const { nextGreenSlot, nextToczySlot, nextStoiSlot } = useMemo(() => {
    if (!weeklyReports || weeklyReports.length === 0) {
      return { nextGreenSlot: null, nextToczySlot: null, nextStoiSlot: null };
    }

    const now = new Date();
    
    // Predict traffic for the next 10 hours (30 intervals of 20 minutes) - same as ExtendedPredictedTraffic
    const intervals = [];
    for (let i = 0; i < 30; i++) {
      const intervalTime = addMinutes(now, i * 20);
      const predictions = predictTrafficIntervals(weeklyReports, direction, intervalTime, 1);
      intervals.push({
        time: intervalTime,
        status: predictions[0]?.status || 'jedzie'
      });
    }

    // Group consecutive intervals with the same status
    const ranges = [];
    let rangeStart = intervals[0].time;
    let currentStatus = intervals[0].status;

    for (let i = 1; i < intervals.length; i++) {
      if (intervals[i].status !== currentStatus) {
        // End current range at the start of the next interval
        ranges.push({
          start: format(rangeStart, 'HH:mm', { locale: pl }),
          end: format(intervals[i].time, 'HH:mm', { locale: pl }),
          durationMinutes: Math.round((intervals[i].time.getTime() - rangeStart.getTime()) / (1000 * 60)),
          status: currentStatus,
        });

        rangeStart = intervals[i].time;
        currentStatus = intervals[i].status;
      }
    }

    // Add final range (add 20 minutes to include the last interval)
    const lastInterval = intervals[intervals.length - 1];
    const endTime = addMinutes(lastInterval.time, 20);
    ranges.push({
      start: format(rangeStart, 'HH:mm', { locale: pl }),
      end: format(endTime, 'HH:mm', { locale: pl }),
      durationMinutes: Math.round((endTime.getTime() - rangeStart.getTime()) / (1000 * 60)),
      status: currentStatus,
    });

    // Find first slot of each status type (starting from now)
    let foundGreenSlot = null;
    let foundToczySlot = null;
    let foundStoiSlot = null;

    for (const range of ranges) {
      if (!foundGreenSlot && range.status === 'jedzie') {
        foundGreenSlot = range;
      } else if (!foundToczySlot && range.status === 'toczy_sie') {
        foundToczySlot = range;
      } else if (!foundStoiSlot && range.status === 'stoi') {
        foundStoiSlot = range;
      }

      // Stop once we have all three different status slots
      if (foundGreenSlot && foundToczySlot && foundStoiSlot) {
        break;
      }
    }

    return {
      nextGreenSlot: foundGreenSlot,
      nextToczySlot: foundToczySlot,
      nextStoiSlot: foundStoiSlot,
    };
  }, [weeklyReports, direction]);

  // Save selected street to localStorage
  useEffect(() => {
    console.log(`[StreetChange] Street or direction changed: ${selectedStreet} (${direction})`);
    localStorage.setItem('selectedStreet', selectedStreet);
    // Load incident notification preference when street changes
    setIncidentNotificationsEnabled(isOneSignalSubscribed(`incidents_${selectedStreet}`));
  }, [selectedStreet, direction]);

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

  const fetchReports = async (street: string, currentDirection: string = direction) => {
    setIsLoading(true);
    try {
      // Fetch last 4 weeks of reports for better traffic predictions
      // (Components like WeeklyTimeline and GreenWave filter to 7 days internally)
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const { data: weekData, error: weekError } = await supabase
        .from("traffic_reports")
        .select("*")
        .eq("street", street)
        .eq("direction", currentDirection)
        .gte("reported_at", fourWeeksAgo.toISOString())
        .order("reported_at", { ascending: false });

      if (weekError) throw weekError;
      setWeeklyReports(weekData || []);

      // Fetch reports for both directions for commute optimizer
      const { data: commuteData, error: commuteError } = await supabase
        .from("traffic_reports")
        .select("*")
        .eq("street", street)
        .gte("reported_at", fourWeeksAgo.toISOString())
        .order("reported_at", { ascending: false });

      if (commuteError) throw commuteError;
      setCommuteReports(commuteData || []);

      // Fetch today's reports for today timeline
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: todayData, error: todayError } = await supabase
        .from("traffic_reports")
        .select("*")
        .eq("street", street)
        .eq("direction", currentDirection)
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
          .eq('direction', currentDirection)
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
        .eq('direction', currentDirection)
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

  const getIncidentTimeWindow = (incidentType: string): number => {
    const timeWindows: Record<string, number> = {
      'Blokada': 1,      // 1 hour
      'Wypadek': 1,      // 1 hour
      'Objazd': 6,       // 6 hours
      'Roboty': 24,      // 24 hours
      'Ślisko': 3,       // 3 hours
      'Dziury': 48,      // 48 hours
      'Zwierze': 1,      // 1 hour
      'Awaria': 1,       // 1 hour
    };
    return timeWindows[incidentType] || 1;
  };

  const fetchIncidentCounts = async () => {
    try {
      const incidentTypes = ['Blokada', 'Wypadek', 'Objazd', 'Roboty', 'Ślisko', 'Dziury', 'Zwierze', 'Awaria'];
      const counts: Record<string, number> = {};

      // Fetch counts for each incident type with its specific time window
      for (const incidentType of incidentTypes) {
        const hoursAgo = getIncidentTimeWindow(incidentType);
        const timeAgo = new Date();
        timeAgo.setHours(timeAgo.getHours() - hoursAgo);

        const { data, error } = await supabase
          .from("incident_reports")
          .select("id")
          .eq("street", selectedStreet)
          .eq("direction", direction)
          .eq("incident_type", incidentType)
          .gte("reported_at", timeAgo.toISOString());

        if (!error && data) {
          counts[incidentType] = data.length;
        }
      }

      setIncidentCounts(counts);
    } catch (error) {
      console.error("Error fetching incident counts:", error);
    }
  };

  const fetchSpeedStats = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from("daily_speed_stats")
        .select("street, direction, min_speed, max_speed")
        .eq("speed_date", today);

      if (error) throw error;

      if (data) {
        const minSpeeds: Record<string, number> = {};
        const maxSpeeds: Record<string, number> = {};
        
        data.forEach(stat => {
          const key = `${stat.street}_${stat.direction}`;
          minSpeeds[key] = stat.min_speed;
          maxSpeeds[key] = stat.max_speed;
        });
        
        setTodayMinSpeed(minSpeeds);
        setTodayMaxSpeed(maxSpeeds);
      }
    } catch (error) {
      console.error("Error fetching speed stats:", error);
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
    // Check subscription status when street changes
    setIncidentNotificationsEnabled(isOneSignalSubscribed(`incidents_${selectedStreet}`));
    setStatusNotificationsEnabled(isOneSignalSubscribed(`street_${selectedStreet.toLowerCase()}_status`));
    
    fetchReports(selectedStreet, direction);
    fetchVisitorStats();
    fetchIncidentCounts();
    fetchSpeedStats();
    recordVisit();

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchReports(selectedStreet, direction);
      fetchVisitorStats();
      fetchIncidentCounts();
      fetchSpeedStats();
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
          fetchReports(selectedStreet, direction);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [selectedStreet, direction]);

  const handleSpeedUpdate = async (speed: number | null) => {
    console.log(`[SpeedFlow] 1. handleSpeedUpdate called: speed=${speed} km/h, currentStatus=${currentStatus}, lastKnownSpeed=${lastKnownSpeed}`);
    setLatestSpeed(speed);
    if (speed !== null) {
      setLastKnownSpeed(speed); // Keep for manual submissions
      currentSpeedRef.current = speed; // Update ref for immediate access in button clicks
      console.log(`[SpeedFlow] 2. Setting lastKnownSpeed and currentSpeedRef to ${speed}`);
    }
    
    // Update min/max speeds for today per street+direction
    if (speed !== null && speed > 0) {
      const key = `${selectedStreet}_${direction}`;
      const today = format(new Date(), 'yyyy-MM-dd');
      
      try {
        // First, fetch current database values for this street+direction+date
        const { data: existingData, error: fetchError } = await supabase
          .from("daily_speed_stats")
          .select("min_speed, max_speed")
          .eq("street", selectedStreet)
          .eq("direction", direction)
          .eq("speed_date", today)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching existing speed stats:", fetchError);
          return;
        }

        // Determine new min/max based on database values (not local state)
        const dbMin = existingData?.min_speed;
        const dbMax = existingData?.max_speed;
        
        const newMin = !dbMin || speed < dbMin ? speed : dbMin;
        const newMax = !dbMax || speed > dbMax ? speed : dbMax;
        
        // Only update if values changed from database values
        if (newMin !== dbMin || newMax !== dbMax) {
          const { error: upsertError } = await supabase
            .from("daily_speed_stats")
            .upsert({
              street: selectedStreet,
              direction: direction,
              speed_date: today,
              min_speed: newMin,
              max_speed: newMax,
            }, {
              onConflict: 'street,direction,speed_date'
            });

          if (upsertError) {
            console.error("Error updating speed stats:", upsertError);
          } else {
            console.log(`[AutoSpeed] Updated DB: min=${newMin}, max=${newMax} (was: min=${dbMin}, max=${dbMax})`);
            // Update local state after successful database update
            setTodayMinSpeed(prev => ({ ...prev, [key]: newMin }));
            setTodayMaxSpeed(prev => ({ ...prev, [key]: newMax }));
          }
        } else {
          console.log(`[AutoSpeed] No update needed: speed=${speed}, current min=${dbMin}, max=${dbMax}`);
        }
      } catch (error) {
        console.error("Error in speed update:", error);
      }
    }
  };

  const handleDistanceUpdate = (distance: number | null) => {
    setStreetDistance(distance);
  };

  const checkAndAssignCoupon = async (userFingerprint: string) => {
    try {
      const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
      
      // Check if user already has a coupon assigned today
      const lastCouponDate = localStorage.getItem(`lastCouponDate_${userFingerprint}`);
      if (lastCouponDate === today) {
        console.log("[Coupon] User already received coupon today");
        return;
      }

      // Get first active coupon that matches current street or has no street restriction
      const { data: coupons, error: couponError } = await supabase
        .from("coupons")
        .select(`
          id,
          local_name,
          discount,
          local_id,
          image_link,
          show_on_streets
        `)
        .eq("status", "active")
        .order("created_at", { ascending: true });

      if (couponError || !coupons || coupons.length === 0) {
        console.log("[Coupon] No active coupons available");
        return;
      }

      // Filter coupons: either show_on_streets is null/empty OR matches current street
      const availableCoupons = coupons.filter(c => 
        !c.show_on_streets || c.show_on_streets === selectedStreet
      );

      if (availableCoupons.length === 0) {
        console.log("[Coupon] No coupons available for current street:", selectedStreet);
        return;
      }

      const coupon = availableCoupons[0];

      // Get location details
      const { data: location } = await supabase
        .from("locations")
        .select("street")
        .eq("id", coupon.local_id)
        .single();

      // Update coupon status to redeemed and set time_to to 3 days from now
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      threeDaysFromNow.setHours(23, 59, 59, 999);

      const { error: updateError } = await supabase
        .from("coupons")
        .update({
          status: "redeemed",
          time_to: threeDaysFromNow.toISOString()
        })
        .eq("id", coupon.id);

      if (updateError) {
        console.error("[Coupon] Error updating coupon:", updateError);
        return;
      }

      // Store that user received coupon today
      localStorage.setItem(`lastCouponDate_${userFingerprint}`, today);

      // Show coupon dialog
      setCouponReward({
        id: coupon.id,
        local_name: coupon.local_name,
        discount: coupon.discount,
        location_street: location?.street || null,
        image_link: coupon.image_link
      });
      setShowCouponDialog(true);

    } catch (error) {
      console.error("[Coupon] Error in checkAndAssignCoupon:", error);
    }
  };

  // Auto-submit when status becomes null and we have valid speed
  useEffect(() => {
    console.log(`[SpeedFlow] 3. Auto-submit useEffect triggered: currentStatus=${currentStatus}, latestSpeed=${latestSpeed}, lastKnownSpeed=${lastKnownSpeed}`);
    if (currentStatus === null && latestSpeed !== null && latestSpeed > 0) {
      let autoStatus: string;
      if (latestSpeed < 10) {
        autoStatus = 'stoi';
      } else if (latestSpeed <= 20) {
        autoStatus = 'toczy_sie';
      } else {
        autoStatus = 'jedzie';
      }

      console.log(`[SpeedFlow] 4. Auto-submitting: autoStatus=${autoStatus}, latestSpeed=${latestSpeed} km/h`);
      submitReport(autoStatus, true, latestSpeed); // Pass speed directly to avoid stale closure
      setLatestSpeed(null); // Reset to prevent duplicate submissions
    }
  }, [currentStatus, latestSpeed]);

  const submitReport = async (status: string, isAutoSubmit: boolean = false, speedOverride?: number | null) => {
    try {
      // Get or create persistent user fingerprint
      let userFingerprint = localStorage.getItem('userFingerprint');
      if (!userFingerprint) {
        userFingerprint = `user_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
        localStorage.setItem('userFingerprint', userFingerprint);
      }

      // Use speedOverride if provided (for auto-submit), otherwise use ref for immediate access
      const speedToSubmit = speedOverride !== undefined ? speedOverride : currentSpeedRef.current;
      console.log(`[SpeedFlow] 5. submitReport called: status=${status}, speedOverride=${speedOverride}, currentSpeedRef=${currentSpeedRef.current}, lastKnownSpeed=${lastKnownSpeed}, speedToSubmit=${speedToSubmit}, isAuto=${isAutoSubmit}`);

      const requestBody = {
        street: selectedStreet,
        status,
        userFingerprint,
        direction,
        speed: speedToSubmit,
      };
      console.log(`[SpeedFlow] 6. Request body to backend:`, JSON.stringify(requestBody));

      const { data, error } = await supabase.functions.invoke('submit-traffic-report', {
        body: requestBody,
      });

      console.log(`[SpeedFlow] 7. Backend response:`, JSON.stringify(data), error ? `Error: ${error.message}` : 'No error');

      if (error) {
        throw new Error(error.message || 'Failed to submit report');
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      // Only show thank you message for manual submissions, not auto-submissions
      if (!isAutoSubmit) {
        toast.success("Dziękujemy za zgłoszenie!");
        // RSS ticker disabled - uncomment line below to re-enable
        // setShowRssTicker(true);
        
        // Check for coupon reward (only for manual submissions, first time today)
        await checkAndAssignCoupon(userFingerprint);
      }
      
      // Wait for database to commit, then refresh status box
      setTimeout(() => {
        console.log(`[SubmitReport] Refreshing status box after ${isAutoSubmit ? 'auto' : 'manual'} submission`);
        fetchReports(selectedStreet, direction);
        fetchIncidentCounts();
      }, 1000);
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
      const success = await unsubscribeFromOneSignal(`incidents_${selectedStreet}`);
      if (success) {
        setIncidentNotificationsEnabled(false);
        toast.success("Powiadomienia o zdarzeniach wyłączone");
      } else {
        toast.error("Błąd podczas wyłączania powiadomień");
      }
    } else {
      // Subscribe
      const success = await subscribeToOneSignal(`incidents_${selectedStreet}`);
      if (success) {
        setIncidentNotificationsEnabled(true);
        toast.success("Powiadomienia o zdarzeniach włączone");
      } else {
        toast.error("Nie udało się włączyć powiadomień. Sprawdź ustawienia przeglądarki.");
      }
    }
  };

  const handleStatusNotifications = async () => {
    if (!("Notification" in window)) {
      toast.error("Twoja przeglądarka nie obsługuje powiadomień");
      return;
    }

    const tag = `street_${selectedStreet.toLowerCase()}_status`;

    if (statusNotificationsEnabled) {
      // Unsubscribe
      const success = await unsubscribeFromOneSignal(tag);
      if (success) {
        setStatusNotificationsEnabled(false);
        toast.success("Powiadomienia o statusie wyłączone");
      } else {
        toast.error("Błąd podczas wyłączania powiadomień");
      }
    } else {
      // Subscribe
      const success = await subscribeToOneSignal(tag);
      if (success) {
        setStatusNotificationsEnabled(true);
        toast.success("Powiadomienia o statusie włączone");
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
      <RssTicker onIncidentsChange={setActiveIncidents} />
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="space-y-3">
            {/* Top tagline */}
            <p className="text-sm text-muted-foreground">Oszczędzaj czas i paliwo. Nim ruszysz sprawdź:</p>

            {/* Main question with inline street select + direction filters (desktop) */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              {/* Question with inline select */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold whitespace-nowrap">Czy</h1>
                <Select value={selectedStreet} onValueChange={setSelectedStreet}>
                  <SelectTrigger className="w-auto min-w-[180px] h-10 text-base font-bold">
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
                <h1 className="text-xl font-bold whitespace-nowrap">stoi?</h1>
              </div>

              {/* Direction Buttons - shown on desktop only */}
              <div className="hidden md:block md:flex-shrink-0">
                <Tabs value={direction} onValueChange={setDirection} className="w-full">
                  <TabsList className="grid grid-cols-2 h-10 bg-muted w-auto">
                    <TabsTrigger
                      value="to_center"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:shadow-md flex items-center justify-center gap-2 px-4"
                    >
                      <ArrowUp className="w-4 h-4" />
                      Do centrum
                    </TabsTrigger>
                    <TabsTrigger
                      value="from_center"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:shadow-md flex items-center justify-center gap-2 px-4"
                    >
                      <ArrowDown className="w-4 h-4" />
                      Od centrum
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Direction Buttons - shown on mobile only */}
            <div className="md:hidden">
              <Tabs value={direction} onValueChange={setDirection} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-11 bg-muted">
                  <TabsTrigger
                    value="to_center"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:shadow-md flex items-center justify-center gap-2"
                  >
                    <ArrowUp className="w-4 h-4" />
                    Do centrum
                  </TabsTrigger>
                  <TabsTrigger
                    value="from_center"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:shadow-md flex items-center justify-center gap-2"
                  >
                    <ArrowDown className="w-4 h-4" />
                    Od centrum
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-8">

        {/* Live traffic label or incident alerts */}
        {activeIncidents.length > 0 ? (
          <div className="space-y-2">
            {activeIncidents.map((incident, index) => (
              <Alert key={index} variant="destructive" className="bg-white border-2 border-red-600">
                <AlertDescription className="font-bold text-red-600 text-center">
                  {incident}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center -mb-4">Korki na żywo na podstawie zgłoszeń mieszkańców</p>
        )}

        {/* Current Status */}
        <section
          className={`relative rounded-lg py-6 px-[19px] text-center transition-colors min-h-[200px] flex flex-col justify-center ${
            statusConfig ? statusConfig.color : "bg-muted"
          }`}
        >
          {statusNotificationsEnabled && (
            <Button
              onClick={handleStatusNotifications}
              variant="default"
              size="icon"
              className="absolute top-3 right-3 h-8 w-8"
            >
              <Bell className="h-4 w-4" />
            </Button>
          )}
          
          {isLoading ? (
            <p className="text-lg font-semibold">Ładowanie...</p>
          ) : statusConfig ? (
            <>
              <h2
                className={`text-2xl font-bold mb-1.5 ${statusConfig.textColor}`}
              >
                {selectedStreet} {statusConfig.label}
              </h2>
              <p
                className={`text-lg font-semibold mt-1.5 mb-2 ${statusConfig.textColor}`}
              >
                {currentStatus === 'stoi' && 'Lepiej wyjedź później'}
                {currentStatus === 'toczy_sie' && 'Jedź jeśli musisz'}
                {currentStatus === 'jedzie' && 'Możesz ruszać :)'}
              </p>
              {Object.keys(lastTenStats).length > 0 && (
                <>
                  <p className={`text-sm font-bold mt-1.5 ${statusConfig.textColor} opacity-80`}>
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
          
          {!statusNotificationsEnabled && (
            <div className="mt-3 pt-3 border-t border-border">
              <Button
                onClick={handleStatusNotifications}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <BellOff className="mr-2 h-4 w-4" />
                Powiadom mnie o blokadzie drogi
              </Button>
            </div>
          )}
        </section>

        {/* Report Buttons */}
        <section className="space-y-3 -mt-2.5">
          <h3 className="text-sm font-medium text-center">
            Poinformuj sąsiadów. Jak wygląda teraz ruch?
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={() => submitReport("stoi")}
              className="h-16 bg-traffic-stoi hover:bg-traffic-stoi/90 text-traffic-stoi-foreground flex flex-col gap-1"
            >
              <svg width="34" height="34" viewBox="0 0 100 100" className="mb-1">
                <polygon 
                  points="50,5 85,25 85,75 50,95 15,75 15,25" 
                  fill="#dc2626" 
                  stroke="white" 
                  strokeWidth="6"
                />
                <text 
                  x="50" 
                  y="60" 
                  textAnchor="middle" 
                  fill="white" 
                  fontSize="28" 
                  fontWeight="bold"
                  fontFamily="Arial, sans-serif"
                >
                  STOP
                </text>
              </svg>
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

        {/* Predicted Traffic */}
        <section>
          <PredictedTraffic reports={weeklyReports} direction={direction} />
        </section>

        {/* Extended Predicted Traffic */}
        <section>
          <ExtendedPredictedTraffic reports={weeklyReports} direction={direction} />
        </section>

        {/* Next Green Slot */}
        {(nextGreenSlot || nextToczySlot || nextStoiSlot) && (
          <section className="bg-card rounded-lg p-5 border border-border space-y-3">
            <h3 className="text-base font-semibold">
              Planuj. Jedź, gdy ruch jest mniejszy:
            </h3>
            
            {nextGreenSlot && (
              <div className="bg-traffic-jedzie/10 border border-traffic-jedzie/20 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">
                      {nextGreenSlot.start}
                    </span>
                    <span className="text-muted-foreground">do</span>
                    <span className="text-lg font-semibold">
                      {nextGreenSlot.end}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    trwa {formatDuration(nextGreenSlot.durationMinutes)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground/60 mt-2">
                  Najbliższa zielona fala. {streetDistance !== null && `Możesz oszczędzić około ${(streetDistance * (1/6.0 - 1/40.0) * 60).toFixed(1)} minut`}
                </p>
              </div>
            )}

            {nextToczySlot && (
              <>
                <p className="text-sm font-semibold">
                  lub chociaż kiedy to jakoś się toczy:
                </p>
                <div className="bg-traffic-toczy/10 border border-traffic-toczy/20 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {nextToczySlot.start}
                      </span>
                      <span className="text-muted-foreground">do</span>
                      <span className="text-lg font-semibold">
                        {nextToczySlot.end}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      trwa {formatDuration(nextToczySlot.durationMinutes)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground/60 mt-2">
                    Najbliższy slot kiedy się toczy. {streetDistance !== null && `Możesz oszczędzić około ${(streetDistance * (1/10.0 - 1/40.0) * 60).toFixed(1)} minut`}
                  </p>
                </div>
              </>
            )}

            {nextStoiSlot && (
              <>
                <p className="text-sm font-semibold">
                  bo najbliższy Armaageeedoon! jest o:
                </p>
                <div className="bg-traffic-stoi/10 border border-traffic-stoi/20 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {nextStoiSlot.start}
                      </span>
                      <span className="text-muted-foreground">do</span>
                      <span className="text-lg font-semibold">
                        {nextStoiSlot.end}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      trwa {formatDuration(nextStoiSlot.durationMinutes)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground/60 mt-2">
                    Jak już musisz, jedź rowerem popatrzeć sobie jak inni stoją lub zrób sobie małą drzemkę
                  </p>
                </div>
              </>
            )}
          </section>
        )}

        {/* Green Wave */}
        <GreenWave reports={weeklyReports} />

        {/* Commute Optimizer */}
        <section className="bg-card rounded-lg p-5 border border-border">
          <CommuteOptimizer reports={commuteReports} />
        </section>

        {/* Today's Timeline */}
        <section id="stan-ruchu" className="bg-card rounded-lg p-5 border border-border space-y-4">
          <TodayTimeline 
            reports={todayReports} 
            street={selectedStreet}
            minSpeed={todayMinSpeed[`${selectedStreet}_${direction}`]}
            maxSpeed={todayMaxSpeed[`${selectedStreet}_${direction}`]}
          />
          <TrafficLine 
            street={selectedStreet} 
            direction={direction as "to_center" | "from_center"}
            onSpeedUpdate={handleSpeedUpdate}
            onDistanceUpdate={handleDistanceUpdate}
          />
        </section>

        {/* Weekly Timeline */}
        <WeeklyTimeline reports={weeklyReports} />

        {/* Last Update Info */}
        <section className="text-center text-sm text-muted-foreground space-y-1">
          <p>
            Ostatnie zgłoszenie z:{" "}
            {format(lastUpdate, "dd.MM.yyyy, HH:mm", { locale: pl })}
          </p>
          <p>
            Dziś korki sprawdziło już <strong>{todayVisitors}</strong> osób
          </p>
          <p className="text-base font-semibold">
            Petycja: Drogi Wrocławiu, <strong>{totalVisitors}</strong> osób sprawdzało, czy są korki. Pomóż nam <span className="text-primary">redukować korki</span>
          </p>
        </section>

        {/* Incident Reports */}
        <section id="zglos" className="bg-card rounded-lg p-5 border-2 border-destructive shadow-lg shadow-destructive/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-center">
                Zgłoś zdarzenie na drodze
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                Licznik pokazuje ile osób potwierdziło zgłoszenie
              </p>
            </div>
            <Button
              onClick={handleIncidentNotifications}
              variant={incidentNotificationsEnabled ? "default" : "outline"}
              size="sm"
              className="ml-2 shrink-0"
            >
              {incidentNotificationsEnabled ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </Button>
          </div>
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

        {/* SMS Subscription */}
        <section>
          <SmsSubscription selectedStreet={selectedStreet} />
        </section>

        {/* Weather Forecast */}
        <section id="na-rowerze">
          <WeatherForecast street={selectedStreet} />
        </section>

        {/* Street Chat */}
        <section id="cb-radio">
          <StreetChat street={selectedStreet} />
        </section>

        {/* Chat Use Cases */}
        <section className="bg-card rounded-lg p-4 border border-border space-y-3">
          <h3 className="text-lg font-semibold text-center">
            O czym pisać na czacie?
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

        {/* City Voting */}
        <section className="hidden">
          <CityVoting />
        </section>
      </main>

      {/* Footer */}
      <footer className="container max-w-2xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground space-y-3">
        {/* Support Section */}
        <div id="jak-korzystac" className="bg-card rounded-lg p-6 border border-border space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-foreground">
            Nie chcę tracić życia w korkach, dlatego
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
              <span>Wybierasz się na zakupy, jedź gdy nie ma ruchu</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Sprawdź rano czy jest korek, by nie spóźnić się do pracy</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Luźny wypad na miasto? Wybierz najodpowiednią porę</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Jedziesz na siłownię lub basen? Jedź podczas zielonej fali</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Łączmy się w bólu, śmiejmy z korków</span>
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
            <Share2 className="mr-2 h-4 w-4" />
            Udostępnij znajomemu
          </Button>

          <Button
            onClick={handleInstallClick}
            className="w-full"
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            Dodaj aplikację na pulpit
          </Button>
        </section>

        {/* Street Voting */}
        <section>
          <StreetVoting existingStreets={STREETS} />
        </section>

        <div className="flex flex-wrap justify-center gap-4 mt-6 pt-4 pb-28 border-t border-border">
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
          <span className="text-muted-foreground">•</span>
          <Link to="/statystyki" className="text-sm text-primary hover:underline">
            Statystyki
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
      <AlertDialog open={!!pendingIncident} onOpenChange={(open) => {
        if (!open) {
          setPendingIncident(null);
          setIncidentMessage("");
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Jak możesz opisz dokładniej to zdarzenie. Jak nie masz czasu, zostaw opis pusty i kliknij Wyślij
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={incidentMessage}
              onChange={(e) => setIncidentMessage(e.target.value)}
              placeholder="Opis zdarzenia (opcjonalny)..."
              className="resize-none"
              rows={8}
              maxLength={500}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingIncident) {
                  await submitIncidentReport(pendingIncident.type);
                  
                  // If message is not empty, submit it to chat
                  if (incidentMessage.trim()) {
                    try {
                      const userFingerprint = localStorage.getItem('userFingerprint') || 
                        `user_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
                      
                      await supabase.functions.invoke('submit-chat-message', {
                        body: {
                          street: selectedStreet,
                          message: `🚨 ${pendingIncident.emoji} ${pendingIncident.type}: ${incidentMessage.trim()}`,
                          userFingerprint,
                        },
                      });
                    } catch (error) {
                      console.error("Error submitting chat message:", error);
                    }
                  }
                  
                  setPendingIncident(null);
                  setIncidentMessage("");
                }
              }}
            >
              Wyślij
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Coupon Reward Dialog */}
      <Dialog open={showCouponDialog} onOpenChange={setShowCouponDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-center text-lg pr-8 font-bold">
              Twoje zaangażowanie zostało nagrodzone przez Patrona portalu eJedzie.pl
            </DialogTitle>
          </DialogHeader>
          
          {couponReward && (
            <div className="space-y-4 pb-6">
              {/* Coupon Image with Overlay Text */}
              {couponReward.image_link && (
                <div className="relative w-full px-6">
                  <div className="relative rounded-xl overflow-hidden shadow-lg">
                    <img
                      src={couponReward.image_link}
                      alt="Kupon"
                      className="w-full h-auto object-cover"
                    />
                    {/* Overlay Text on Image */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/95 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-2xl border-4 border-primary max-w-[85%] sm:max-w-[75%]">
                        <p className="text-black font-bold text-center text-base sm:text-lg md:text-xl leading-tight">
                          Otrzymujesz Kupon ze zniżką od 10 do {couponReward.discount}%
                        </p>
                        <p className="text-black font-semibold text-center text-sm sm:text-base mt-2">
                          Kupon jest ważny 3 dni
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Location Details */}
              <div className="text-center space-y-1 px-6">
                <p className="font-bold text-lg text-primary">{couponReward.local_name}</p>
                {couponReward.location_street && (
                  <p className="text-sm text-muted-foreground">{couponReward.location_street}</p>
                )}
              </div>
              
              {/* Copy Link Section */}
              <div className="space-y-3 px-6">
                <p className="text-sm font-bold text-center bg-accent/20 py-2 rounded-lg">
                  Skopiuj i zapisz swój link do kuponu. Otwórz link w lokalu
                </p>
                <div 
                  className="bg-primary/10 p-3 rounded-lg cursor-pointer hover:bg-primary/20 transition-colors border-2 border-primary/30"
                  onClick={() => {
                    const link = `https://ejedzie.pl/kupon?id=${couponReward.id}`;
                    navigator.clipboard.writeText(link);
                    toast.success("Link skopiowany!");
                    window.open(link, '_blank');
                  }}
                >
                  <p className="text-sm sm:text-base font-mono break-all text-center font-bold text-primary">
                    https://ejedzie.pl/kupon?id={couponReward.id}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://ejedzie.pl/kupon?id=${couponReward.id}`);
                    toast.success("Link skopiowany do schowka!");
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-base rounded-xl shadow-lg"
                >
                  Kopiuj link
                </Button>
                <Button
                  onClick={() => {
                    setShowCouponDialog(false);
                    setCouponReward(null);
                  }}
                  className="w-full bg-white text-black hover:bg-gray-100 border-2 border-border"
                  variant="outline"
                >
                  Skopiowane i zapisane, zamknij
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation Menu */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50 pb-safe">
        <div className="container max-w-2xl mx-auto">
          <div className="grid grid-cols-6 gap-2 px-1 py-2">
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex flex-col items-center pt-2 pb-1 px-1 text-xs hover:bg-muted rounded-lg transition-colors"
            >
              <Calendar className="w-5 h-5 mb-1 flex-shrink-0" />
              <span className="leading-tight text-center h-8 flex items-center">Kiedy jechać?</span>
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('stan-ruchu');
                const header = document.querySelector('header');
                const headerHeight = header?.offsetHeight || 0;
                const elementPosition = element?.getBoundingClientRect().top + window.pageYOffset;
                if (elementPosition) {
                  window.scrollTo({ top: elementPosition - headerHeight - 10, behavior: 'smooth' });
                }
              }}
              className="flex flex-col items-center pt-2 pb-1 px-1 text-xs hover:bg-muted rounded-lg transition-colors"
            >
              <Activity className="w-5 h-5 mb-1 flex-shrink-0" />
              <span className="leading-tight text-center h-8 flex items-center">Stan ruchu</span>
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('zglos');
                const header = document.querySelector('header');
                const headerHeight = header?.offsetHeight || 0;
                const elementPosition = element?.getBoundingClientRect().top + window.pageYOffset;
                if (elementPosition) {
                  window.scrollTo({ top: elementPosition - headerHeight - 10, behavior: 'smooth' });
                }
              }}
              className="flex flex-col items-center pt-2 pb-1 px-1 text-xs hover:bg-muted rounded-lg transition-colors"
            >
              <AlertTriangle className="w-5 h-5 mb-1 flex-shrink-0" />
              <span className="leading-tight text-center h-8 flex items-center">Zgłoś</span>
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('na-rowerze');
                const header = document.querySelector('header');
                const headerHeight = header?.offsetHeight || 0;
                const elementPosition = element?.getBoundingClientRect().top + window.pageYOffset;
                if (elementPosition) {
                  window.scrollTo({ top: elementPosition - headerHeight - 10, behavior: 'smooth' });
                }
              }}
              className="flex flex-col items-center pt-2 pb-1 px-1 text-xs hover:bg-muted rounded-lg transition-colors"
            >
              <Bike className="w-5 h-5 mb-1 flex-shrink-0" />
              <span className="leading-tight text-center h-8 flex items-center">Na rowerze</span>
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('cb-radio');
                const header = document.querySelector('header');
                const headerHeight = header?.offsetHeight || 0;
                const elementPosition = element?.getBoundingClientRect().top + window.pageYOffset;
                if (elementPosition) {
                  window.scrollTo({ top: elementPosition - headerHeight - 10, behavior: 'smooth' });
                }
              }}
              className="flex flex-col items-center pt-2 pb-1 px-1 text-xs hover:bg-muted rounded-lg transition-colors"
            >
              <MessageSquare className="w-5 h-5 mb-1 flex-shrink-0" />
              <span className="leading-tight text-center h-8 flex items-center">CB radio</span>
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('jak-korzystac');
                const header = document.querySelector('header');
                const headerHeight = header?.offsetHeight || 0;
                const elementPosition = element?.getBoundingClientRect().top + window.pageYOffset;
                if (elementPosition) {
                  window.scrollTo({ top: elementPosition - headerHeight - 10, behavior: 'smooth' });
                }
              }}
              className="flex flex-col items-center pt-2 pb-1 px-1 text-xs hover:bg-muted rounded-lg transition-colors"
            >
              <HelpCircle className="w-5 h-5 mb-1 flex-shrink-0" />
              <span className="leading-tight text-center h-8 flex items-center">Jak korzystać</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Index;