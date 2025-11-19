import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter, ComposedChart } from "recharts";
import { format, parseISO, getHours, getDay } from "date-fns";
import { pl } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'];
const GRADIENT_COLORS = [
  { start: '#8b5cf6', end: '#6366f1' },
  { start: '#06b6d4', end: '#0891b2' },
  { start: '#10b981', end: '#059669' },
  { start: '#f59e0b', end: '#d97706' },
  { start: '#ef4444', end: '#dc2626' },
];

// Streets from Index page - same as "Wybierz ulicę w Wrocławiu" selector
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

const Statystyki = () => {
  const [dailyVisits, setDailyVisits] = useState<any[]>([]);
  const [topStreets, setTopStreets] = useState<any[]>([]);
  const [topCities, setTopCities] = useState<any[]>([]);
  const [trafficByStatus, setTrafficByStatus] = useState<any[]>([]);
  const [trafficByStreet, setTrafficByStreet] = useState<any[]>([]);
  const [incidentsByType, setIncidentsByType] = useState<any[]>([]);
  const [incidentsByStreet, setIncidentsByStreet] = useState<any[]>([]);
  const [chatActivity, setChatActivity] = useState<any[]>([]);
  const [trafficOverTime, setTrafficOverTime] = useState<any[]>([]);
  const [incidentsOverTime, setIncidentsOverTime] = useState<any[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [trafficByDirection, setTrafficByDirection] = useState<any[]>([]);
  const [incidentsByDirection, setIncidentsByDirection] = useState<any[]>([]);
  const [trafficByHour, setTrafficByHour] = useState<any[]>([]);
  const [chatOverTime, setChatOverTime] = useState<any[]>([]);
  const [topActiveStreets, setTopActiveStreets] = useState<any[]>([]);
  const [trafficByStreetAndHour, setTrafficByStreetAndHour] = useState<any[]>([]);
  const [trafficByStreetAndDay, setTrafficByStreetAndDay] = useState<any[]>([]);

  // New state for traffic status scatter chart
  const [availableStreets, setAvailableStreets] = useState<string[]>([]);
  const [selectedStreet, setSelectedStreet] = useState<string>("");
  const [selectedDirection, setSelectedDirection] = useState<string>("to_center");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [trafficStatusScatterData, setTrafficStatusScatterData] = useState<any[]>([]);
  const [speedLineData, setSpeedLineData] = useState<any[]>([]);

  // New state for date-filtered street/hour chart
  const [selectedHourChartDate, setSelectedHourChartDate] = useState<Date>(new Date());
  const [selectedHourChartStreet, setSelectedHourChartStreet] = useState<string>("all");
  const [selectedHourChartDirection, setSelectedHourChartDirection] = useState<string>("both");
  const [trafficByStreetAndHourFiltered, setTrafficByStreetAndHourFiltered] = useState<any[]>([]);

  // New state for index page selected street chart
  const [indexPageStreet, setIndexPageStreet] = useState<string>("");
  const [indexPageDirection, setIndexPageDirection] = useState<string>("to_center");
  const [indexPageScatterData, setIndexPageScatterData] = useState<any[]>([]);

  useEffect(() => {
    fetchAllStatistics();
    fetchAvailableStreets();

    // Load selected street and direction from localStorage (from index page)
    const savedStreet = localStorage.getItem('selectedStreet');
    const savedDirection = localStorage.getItem('selectedDirection');
    if (savedStreet) {
      setIndexPageStreet(savedStreet);
    }
    if (savedDirection) {
      setIndexPageDirection(savedDirection);
    }
  }, []);

  useEffect(() => {
    if (selectedStreet) {
      fetchTrafficStatusScatterData();
    }
  }, [selectedStreet, selectedDirection, selectedDate]);

  useEffect(() => {
    fetchTrafficByStreetAndHourFiltered();
  }, [selectedHourChartDate, selectedHourChartStreet, selectedHourChartDirection]);

  useEffect(() => {
    if (indexPageStreet) {
      fetchIndexPageScatterData();
    }
  }, [indexPageStreet, indexPageDirection, selectedDate]);

  const fetchAllStatistics = async () => {
    // 1. Daily visits over time (last 30 days)
    const { data: visitsData } = await supabase
      .from("daily_visit_stats")
      .select("*")
      .order("visit_date", { ascending: true })
      .limit(30);
    
    if (visitsData) {
      setDailyVisits(
        visitsData.map((v) => ({
          date: format(parseISO(v.visit_date), "dd MMM", { locale: pl }),
          wizyty: v.visit_count,
        }))
      );
    }

    // 2. Top voted streets
    const { data: streetsData } = await supabase
      .from("street_votes")
      .select("*")
      .order("votes", { ascending: false })
      .limit(10);
    
    if (streetsData) {
      setTopStreets(
        streetsData.map((s) => ({
          name: s.street_name,
          votes: s.votes,
        }))
      );
    }

    // 3. Top voted cities
    const { data: citiesData } = await supabase
      .from("city_votes")
      .select("*")
      .order("votes", { ascending: false })
      .limit(10);
    
    if (citiesData) {
      setTopCities(
        citiesData.map((c) => ({
          name: c.city_name,
          votes: c.votes,
        }))
      );
    }

    // 4. Traffic reports by status
    const { data: trafficStatusData } = await supabase
      .from("traffic_reports")
      .select("status");
    
    if (trafficStatusData) {
      const statusCounts: Record<string, number> = {};
      trafficStatusData.forEach((t) => {
        statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      });
      
      const statusLabels: Record<string, string> = {
        jedzie: "Jedzie",
        toczy_sie: "Toczy się",
        stoi: "Stoi",
      };

      setTrafficByStatus(
        Object.entries(statusCounts).map(([status, count]) => ({
          name: statusLabels[status] || status,
          value: count,
        }))
      );
    }

    // 5. Traffic reports by street (top 10)
    const { data: trafficStreetData } = await supabase
      .from("traffic_reports")
      .select("street");
    
    if (trafficStreetData) {
      const streetCounts: Record<string, number> = {};
      trafficStreetData.forEach((t) => {
        streetCounts[t.street] = (streetCounts[t.street] || 0) + 1;
      });
      
      setTrafficByStreet(
        Object.entries(streetCounts)
          .map(([street, count]) => ({
            name: street,
            raporty: count,
          }))
          .sort((a, b) => b.raporty - a.raporty)
          .slice(0, 10)
      );
    }

    // 6. Incident reports by type
    const { data: incidentTypeData } = await supabase
      .from("incident_reports")
      .select("incident_type");
    
    if (incidentTypeData) {
      const typeCounts: Record<string, number> = {};
      incidentTypeData.forEach((i) => {
        typeCounts[i.incident_type] = (typeCounts[i.incident_type] || 0) + 1;
      });
      
      const typeLabels: Record<string, string> = {
        accident: "Wypadek",
        roadwork: "Roboty drogowe",
        police: "Policja",
        obstacle: "Przeszkoda",
      };

      setIncidentsByType(
        Object.entries(typeCounts).map(([type, count]) => ({
          name: typeLabels[type] || type,
          value: count,
        }))
      );
    }

    // 7. Incident reports by street (top 10)
    const { data: incidentStreetData } = await supabase
      .from("incident_reports")
      .select("street");
    
    if (incidentStreetData) {
      const streetCounts: Record<string, number> = {};
      incidentStreetData.forEach((i) => {
        streetCounts[i.street] = (streetCounts[i.street] || 0) + 1;
      });
      
      setIncidentsByStreet(
        Object.entries(streetCounts)
          .map(([street, count]) => ({
            name: street,
            zdarzenia: count,
          }))
          .sort((a, b) => b.zdarzenia - a.zdarzenia)
          .slice(0, 10)
      );
    }

    // 8. Chat messages activity by street (top 10)
    const { data: chatData } = await supabase
      .from("street_chat_messages")
      .select("street");
    
    if (chatData) {
      const streetCounts: Record<string, number> = {};
      chatData.forEach((c) => {
        streetCounts[c.street] = (streetCounts[c.street] || 0) + 1;
      });
      
      setChatActivity(
        Object.entries(streetCounts)
          .map(([street, count]) => ({
            name: street,
            wiadomości: count,
          }))
          .sort((a, b) => b.wiadomości - a.wiadomości)
          .slice(0, 10)
      );
    }

    // 9. Traffic reports over time (last 30 days)
    const { data: trafficTimeData } = await supabase
      .from("traffic_reports")
      .select("reported_at")
      .gte("reported_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("reported_at", { ascending: true });
    
    if (trafficTimeData) {
      const dateCounts: Record<string, number> = {};
      
      // Generate all 30 days with 0 counts
      for (let i = 29; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = format(date, "yyyy-MM-dd");
        dateCounts[dateStr] = 0;
      }
      
      // Add actual counts
      trafficTimeData.forEach((t) => {
        const date = format(parseISO(t.reported_at), "yyyy-MM-dd");
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      });
      
      setTrafficOverTime(
        Object.entries(dateCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({
            date: format(parseISO(date), "dd MMM", { locale: pl }),
            raporty: count,
          }))
      );
    }

    // 10. Incident reports over time (last 30 days)
    const { data: incidentTimeData } = await supabase
      .from("incident_reports")
      .select("reported_at")
      .order("reported_at", { ascending: true });
    
    if (incidentTimeData) {
      const dateCounts: Record<string, number> = {};
      incidentTimeData.forEach((i) => {
        const date = format(parseISO(i.reported_at), "yyyy-MM-dd");
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      });
      
      setIncidentsOverTime(
        Object.entries(dateCounts)
          .slice(-30)
          .map(([date, count]) => ({
            date: format(parseISO(date), "dd MMM", { locale: pl }),
            zdarzenia: count,
          }))
      );
    }

    // Total visits
    const { data: totalData } = await supabase
      .from("total_visit_counter")
      .select("total_visits")
      .single();
    
    if (totalData) {
      setTotalVisits(totalData.total_visits);
    }

    // 11. Traffic reports by direction
    const { data: trafficDirectionData } = await supabase
      .from("traffic_reports")
      .select("direction");
    
    if (trafficDirectionData) {
      const directionCounts: Record<string, number> = {};
      trafficDirectionData.forEach((t) => {
        directionCounts[t.direction] = (directionCounts[t.direction] || 0) + 1;
      });
      
      const directionLabels: Record<string, string> = {
        to_center: "Do centrum",
        from_center: "Z centrum",
      };

      setTrafficByDirection(
        Object.entries(directionCounts).map(([direction, count]) => ({
          name: directionLabels[direction] || direction,
          value: count,
        }))
      );
    }

    // 12. Incident reports by direction
    const { data: incidentDirectionData } = await supabase
      .from("incident_reports")
      .select("direction");
    
    if (incidentDirectionData) {
      const directionCounts: Record<string, number> = {};
      incidentDirectionData.forEach((i) => {
        directionCounts[i.direction] = (directionCounts[i.direction] || 0) + 1;
      });
      
      const directionLabels: Record<string, string> = {
        to_center: "Do centrum",
        from_center: "Z centrum",
      };

      setIncidentsByDirection(
        Object.entries(directionCounts).map(([direction, count]) => ({
          name: directionLabels[direction] || direction,
          value: count,
        }))
      );
    }

    // 13. Traffic reports by hour of day
    const { data: trafficHourData } = await supabase
      .from("traffic_reports")
      .select("reported_at");
    
    if (trafficHourData) {
      const hourCounts: Record<number, number> = {};
      trafficHourData.forEach((t) => {
        const hour = getHours(parseISO(t.reported_at));
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      
      setTrafficByHour(
        Array.from({ length: 24 }, (_, i) => ({
          hour: `${i}:00`,
          raporty: hourCounts[i] || 0,
        }))
      );
    }

    // 14. Chat messages over time (last 30 days)
    const { data: chatTimeData } = await supabase
      .from("street_chat_messages")
      .select("created_at")
      .order("created_at", { ascending: true });
    
    if (chatTimeData) {
      const dateCounts: Record<string, number> = {};
      chatTimeData.forEach((c) => {
        const date = format(parseISO(c.created_at), "yyyy-MM-dd");
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      });
      
      setChatOverTime(
        Object.entries(dateCounts)
          .slice(-30)
          .map(([date, count]) => ({
            date: format(parseISO(date), "dd MMM", { locale: pl }),
            wiadomości: count,
          }))
      );
    }

    // 15. Top active streets (combined: votes + traffic + incidents + chat)
    const allStreetsActivity: Record<string, { votes: number; traffic: number; incidents: number; chat: number; total: number }> = {};
    
    // Add votes
    if (streetsData) {
      streetsData.forEach((s) => {
        if (!allStreetsActivity[s.street_name]) {
          allStreetsActivity[s.street_name] = { votes: 0, traffic: 0, incidents: 0, chat: 0, total: 0 };
        }
        allStreetsActivity[s.street_name].votes = s.votes;
        allStreetsActivity[s.street_name].total += s.votes;
      });
    }
    
    // Add traffic reports
    if (trafficStreetData) {
      trafficStreetData.forEach((t) => {
        if (!allStreetsActivity[t.street]) {
          allStreetsActivity[t.street] = { votes: 0, traffic: 0, incidents: 0, chat: 0, total: 0 };
        }
        allStreetsActivity[t.street].traffic += 1;
        allStreetsActivity[t.street].total += 1;
      });
    }
    
    // Add incidents
    if (incidentStreetData) {
      incidentStreetData.forEach((i) => {
        if (!allStreetsActivity[i.street]) {
          allStreetsActivity[i.street] = { votes: 0, traffic: 0, incidents: 0, chat: 0, total: 0 };
        }
        allStreetsActivity[i.street].incidents += 1;
        allStreetsActivity[i.street].total += 1;
      });
    }
    
    // Add chat
    if (chatData) {
      chatData.forEach((c) => {
        if (!allStreetsActivity[c.street]) {
          allStreetsActivity[c.street] = { votes: 0, traffic: 0, incidents: 0, chat: 0, total: 0 };
        }
        allStreetsActivity[c.street].chat += 1;
        allStreetsActivity[c.street].total += 1;
      });
    }
    
    setTopActiveStreets(
      Object.entries(allStreetsActivity)
        .map(([street, activity]) => ({
          name: street,
          Głosy: activity.votes,
          Ruch: activity.traffic,
          Zdarzenia: activity.incidents,
          Czat: activity.chat,
        }))
        .sort((a, b) => (b.Głosy + b.Ruch + b.Zdarzenia + b.Czat) - (a.Głosy + a.Ruch + a.Zdarzenia + a.Czat))
        .slice(0, 10)
    );

    // 16. Traffic status by street and hour of day
    const { data: trafficByHourStreetData } = await supabase
      .from("traffic_reports")
      .select("street, status, reported_at");
    
    if (trafficByHourStreetData) {
      // Get top 5 streets by traffic reports
      const streetCounts: Record<string, number> = {};
      trafficByHourStreetData.forEach((t) => {
        streetCounts[t.street] = (streetCounts[t.street] || 0) + 1;
      });
      
      const topStreetsList = Object.entries(streetCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([street]) => street);
      
      // Calculate average traffic score by hour for each street
      // jedzie = 1 (best), toczy_sie = 2 (medium), stoi = 3 (worst)
      const statusScore: Record<string, number> = {
        jedzie: 1,
        toczy_sie: 2,
        stoi: 3,
      };
      
      const streetHourData: Record<number, Record<string, { total: number; count: number }>> = {};
      
      trafficByHourStreetData.forEach((t) => {
        if (topStreetsList.includes(t.street)) {
          const hour = getHours(parseISO(t.reported_at));
          if (!streetHourData[hour]) streetHourData[hour] = {};
          if (!streetHourData[hour][t.street]) streetHourData[hour][t.street] = { total: 0, count: 0 };
          
          streetHourData[hour][t.street].total += statusScore[t.status] || 0;
          streetHourData[hour][t.street].count += 1;
        }
      });
      
      const hourlyData = Array.from({ length: 24 }, (_, hour) => {
        const dataPoint: any = { hour: `${hour}:00` };
        topStreetsList.forEach((street) => {
          if (streetHourData[hour]?.[street]) {
            dataPoint[street] = parseFloat((streetHourData[hour][street].total / streetHourData[hour][street].count).toFixed(2));
          } else {
            dataPoint[street] = null;
          }
        });
        return dataPoint;
      });
      
      setTrafficByStreetAndHour(hourlyData);
    }

    // 17. Traffic status by street and day of week
    const { data: trafficByDayStreetData } = await supabase
      .from("traffic_reports")
      .select("street, status, reported_at");
    
    if (trafficByDayStreetData) {
      // Get top 5 streets by traffic reports
      const streetCounts: Record<string, number> = {};
      trafficByDayStreetData.forEach((t) => {
        streetCounts[t.street] = (streetCounts[t.street] || 0) + 1;
      });
      
      const topStreetsList = Object.entries(streetCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([street]) => street);
      
      // Calculate average traffic score by day of week for each street
      // jedzie = 1 (best), toczy_sie = 2 (medium), stoi = 3 (worst)
      const statusScore: Record<string, number> = {
        jedzie: 1,
        toczy_sie: 2,
        stoi: 3,
      };
      
      const streetDayData: Record<number, Record<string, { total: number; count: number }>> = {};
      
      trafficByDayStreetData.forEach((t) => {
        if (topStreetsList.includes(t.street)) {
          const day = getDay(parseISO(t.reported_at)); // 0 = Sunday, 1 = Monday, etc.
          if (!streetDayData[day]) streetDayData[day] = {};
          if (!streetDayData[day][t.street]) streetDayData[day][t.street] = { total: 0, count: 0 };
          
          streetDayData[day][t.street].total += statusScore[t.status] || 0;
          streetDayData[day][t.street].count += 1;
        }
      });
      
      const dayLabels = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
      
      const dailyData = Array.from({ length: 7 }, (_, day) => {
        const dataPoint: any = { day: dayLabels[day] };
        topStreetsList.forEach((street) => {
          if (streetDayData[day]?.[street]) {
            dataPoint[street] = parseFloat((streetDayData[day][street].total / streetDayData[day][street].count).toFixed(2));
          } else {
            dataPoint[street] = null;
          }
        });
        return dataPoint;
      });
      
      setTrafficByStreetAndDay(dailyData);
    }
  };

  const fetchAvailableStreets = async () => {
    // Use the same streets as the Index page selector ("Wybierz ulicę w Wrocławiu")
    console.log(`Using ${STREETS.length} predefined streets from Index page`);
    setAvailableStreets(STREETS);
    if (STREETS.length > 0 && !selectedStreet) {
      setSelectedStreet(STREETS[0]);
    }
  };

  const fetchTrafficStatusScatterData = async () => {
    if (!selectedStreet || !selectedDate) return;

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: trafficData } = await supabase
      .from("traffic_reports")
      .select("status, reported_at, direction, speed")
      .eq("street", selectedStreet)
      .eq("direction", selectedDirection)
      .gte("reported_at", startOfDay.toISOString())
      .lte("reported_at", endOfDay.toISOString());

    if (trafficData) {
      // Map database status values to Y coordinates
      // Database values: "stoi", "toczy_sie", "jedzie"
      const statusToY: Record<string, number> = {
        jedzie: 1,       // Top of chart
        toczy_sie: 0,    // Middle of chart
        stoi: -1         // Bottom of chart
      };

      const statusToLabel: Record<string, string> = {
        jedzie: 'Jedzie',
        toczy_sie: 'Toczy się',
        stoi: 'Stoi'
      };

      const scatterData = trafficData.map(t => {
        const hour = getHours(parseISO(t.reported_at));
        const minutes = parseISO(t.reported_at).getMinutes();
        const hourDecimal = hour + (minutes / 60); // Convert to decimal hour for better positioning

        return {
          hour: hourDecimal,
          status: statusToY[t.status] ?? 0,
          statusLabel: statusToLabel[t.status] || 'Nieznany',
          time: format(parseISO(t.reported_at), "HH:mm", { locale: pl }),
          rawStatus: t.status, // For debugging
          speed: t.speed || null
        };
      });

      console.log(`[Traffic Status Chart] Fetched ${scatterData.length} data points for ${selectedStreet} on ${format(selectedDate, 'yyyy-MM-dd')}`);
      console.log('[Traffic Status Chart] Sample data:', scatterData.slice(0, 3));

      setTrafficStatusScatterData(scatterData);

      // Create speed line data with all individual data points
      const speedLine = trafficData
        .filter(t => t.speed !== null && t.speed !== undefined)
        .map(t => {
          const hour = getHours(parseISO(t.reported_at));
          const minutes = parseISO(t.reported_at).getMinutes();
          const hourDecimal = hour + (minutes / 60);

          return {
            hour: hourDecimal,
            speed: t.speed,
            time: format(parseISO(t.reported_at), "HH:mm", { locale: pl })
          };
        })
        .sort((a, b) => a.hour - b.hour);

      console.log(`[Traffic Status Chart] Created ${speedLine.length} individual speed data points`);
      setSpeedLineData(speedLine);
    } else {
      setTrafficStatusScatterData([]);
    }
  };

  const fetchTrafficByStreetAndHourFiltered = async () => {
    if (!selectedHourChartDate) return;

    const startOfDay = new Date(selectedHourChartDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedHourChartDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Build query with filters
    let query = supabase
      .from("traffic_reports")
      .select("street, status, reported_at, direction")
      .gte("reported_at", startOfDay.toISOString())
      .lte("reported_at", endOfDay.toISOString());

    // Filter by street if not "all"
    if (selectedHourChartStreet !== "all") {
      query = query.eq("street", selectedHourChartStreet);
    }

    // Filter by direction if not "both"
    if (selectedHourChartDirection !== "both") {
      query = query.eq("direction", selectedHourChartDirection);
    }

    const { data: trafficByHourStreetData } = await query;

    if (trafficByHourStreetData && trafficByHourStreetData.length > 0) {
      // Determine which streets to display
      let streetsToDisplay: string[];

      if (selectedHourChartStreet === "all") {
        // Get top 5 streets by traffic reports for this specific date
        const streetCounts: Record<string, number> = {};
        trafficByHourStreetData.forEach((t) => {
          streetCounts[t.street] = (streetCounts[t.street] || 0) + 1;
        });

        streetsToDisplay = Object.entries(streetCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([street]) => street);
      } else {
        // Show only selected street
        streetsToDisplay = [selectedHourChartStreet];
      }

      // Calculate average traffic score by hour for each street
      // jedzie = 1 (best), toczy_sie = 2 (medium), stoi = 3 (worst)
      const statusScore: Record<string, number> = {
        jedzie: 1,
        toczy_sie: 2,
        stoi: 3,
      };

      const streetHourData: Record<number, Record<string, { total: number; count: number }>> = {};

      trafficByHourStreetData.forEach((t) => {
        if (streetsToDisplay.includes(t.street)) {
          const hour = getHours(parseISO(t.reported_at));
          if (!streetHourData[hour]) streetHourData[hour] = {};
          if (!streetHourData[hour][t.street]) streetHourData[hour][t.street] = { total: 0, count: 0 };

          streetHourData[hour][t.street].total += statusScore[t.status] || 0;
          streetHourData[hour][t.street].count += 1;
        }
      });

      const hourlyData = Array.from({ length: 24 }, (_, hour) => {
        const dataPoint: any = { hour: `${hour}:00` };
        streetsToDisplay.forEach((street) => {
          if (streetHourData[hour]?.[street]) {
            dataPoint[street] = parseFloat((streetHourData[hour][street].total / streetHourData[hour][street].count).toFixed(2));
          } else {
            dataPoint[street] = null;
          }
        });
        return dataPoint;
      });

      console.log(`[Hour Chart Filtered] Date: ${format(selectedHourChartDate, 'yyyy-MM-dd')}, Street: ${selectedHourChartStreet}, Direction: ${selectedHourChartDirection}, Streets: ${streetsToDisplay.length}`);
      setTrafficByStreetAndHourFiltered(hourlyData);
    } else {
      setTrafficByStreetAndHourFiltered([]);
    }
  };

  const fetchIndexPageScatterData = async () => {
    if (!indexPageStreet || !selectedDate) return;

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: trafficData } = await supabase
      .from("traffic_reports")
      .select("status, reported_at, direction")
      .eq("street", indexPageStreet)
      .eq("direction", indexPageDirection)
      .gte("reported_at", startOfDay.toISOString())
      .lte("reported_at", endOfDay.toISOString());

    if (trafficData) {
      const statusToLabel: Record<string, string> = {
        jedzie: 'Jedzie',
        toczy_sie: 'Toczy się',
        stoi: 'Stoi'
      };

      // Map all statuses to Y=0 (same vertical level)
      const scatterData = trafficData.map(t => {
        const hour = getHours(parseISO(t.reported_at));
        const minutes = parseISO(t.reported_at).getMinutes();
        const hourDecimal = hour + (minutes / 60);

        return {
          hour: hourDecimal,
          status: 0, // All dots at Y=0
          statusLabel: statusToLabel[t.status] || 'Nieznany',
          time: format(parseISO(t.reported_at), "HH:mm", { locale: pl }),
          rawStatus: t.status // For color coding
        };
      });

      console.log(`[Index Page Chart] Fetched ${scatterData.length} data points for ${indexPageStreet} (${indexPageDirection}) on ${format(selectedDate, 'yyyy-MM-dd')}`);
      setIndexPageScatterData(scatterData);
    } else {
      setIndexPageScatterData([]);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-primary hover:underline">
              <ArrowLeft className="w-5 h-5" />
              <span>Powrót</span>
            </Link>
            <h1 className="text-lg md:text-xl font-bold text-foreground whitespace-nowrap">Statystyki eJedzie.pl</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Total Visits Card */}
        <Card className="mb-8 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-3xl text-center text-foreground">
              Łączna liczba wizyt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-6xl font-bold text-center text-foreground">
              {totalVisits.toLocaleString("pl-PL")}
            </p>
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Daily Visits Line Chart */}
          <Card className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border-violet-200 dark:border-violet-800">
            <CardHeader>
              <CardTitle className="text-violet-700 dark:text-violet-400">Wizyty dzienne (ostatnie 30 dni)</CardTitle>
              <CardDescription>Liczba odwiedzin strony w ciągu ostatnich 30 dni</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyVisits}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="wizyty" stroke="#8b5cf6" fill="url(#colorVisits)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 2. Top Streets Bar Chart */}
          <Card className="bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border-cyan-200 dark:border-cyan-800">
            <CardHeader>
              <CardTitle className="text-cyan-700 dark:text-cyan-400">Top 10 ulic - głosowanie</CardTitle>
              <CardDescription>Ulice z największą liczbą głosów</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topStreets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={10} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="votes" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 3. Top Cities Bar Chart */}
          <Card className="bg-gradient-to-br from-emerald-500/5 to-green-500/5 border-emerald-200 dark:border-emerald-800">
            <CardHeader>
              <CardTitle className="text-emerald-700 dark:text-emerald-400">Top 10 miast - głosowanie</CardTitle>
              <CardDescription>Miasta z największą liczbą głosów</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCities}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={10} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="votes" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 4. Traffic by Status Pie Chart */}
          <Card className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-200 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="text-amber-700 dark:text-amber-400">Raporty ruchu według statusu</CardTitle>
              <CardDescription>Rozkład raportów według stanu ruchu</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={trafficByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {trafficByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 5. Traffic by Street Bar Chart */}
          <Card className="bg-gradient-to-br from-rose-500/5 to-red-500/5 border-rose-200 dark:border-rose-800">
            <CardHeader>
              <CardTitle className="text-rose-700 dark:text-rose-400">Top 10 ulic - raporty ruchu</CardTitle>
              <CardDescription>Ulice z największą liczbą raportów</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trafficByStreet}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={10} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="raporty" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 6. Incidents by Type Pie Chart */}
          <Card className="bg-gradient-to-br from-pink-500/5 to-rose-500/5 border-pink-200 dark:border-pink-800">
            <CardHeader>
              <CardTitle className="text-pink-700 dark:text-pink-400">Zdarzenia według typu</CardTitle>
              <CardDescription>Rozkład zgłoszeń według rodzaju zdarzenia</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incidentsByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {incidentsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 7. Incidents by Street Bar Chart */}
          <Card className="bg-gradient-to-br from-indigo-500/5 to-blue-500/5 border-indigo-200 dark:border-indigo-800">
            <CardHeader>
              <CardTitle className="text-indigo-700 dark:text-indigo-400">Top 10 ulic - zgłoszenia zdarzeń</CardTitle>
              <CardDescription>Ulice z największą liczbą zgłoszeń</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incidentsByStreet}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={10} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="zdarzenia" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 8. Chat Activity by Street Bar Chart */}
          <Card className="bg-gradient-to-br from-teal-500/5 to-cyan-500/5 border-teal-200 dark:border-teal-800">
            <CardHeader>
              <CardTitle className="text-teal-700 dark:text-teal-400">Top 10 ulic - aktywność czatu</CardTitle>
              <CardDescription>Ulice z największą liczbą wiadomości</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chatActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={10} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="wiadomości" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 9. Traffic Reports Over Time */}
          <Card className="bg-gradient-to-br from-orange-500/5 to-amber-500/5 border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="text-orange-700 dark:text-orange-400">Raporty ruchu w czasie (ostatnie 30 dni)</CardTitle>
              <CardDescription>Liczba raportów ruchu w ciągu ostatnich 30 dni</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trafficOverTime}>
                  <defs>
                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="raporty" stroke="#f97316" fill="url(#colorTraffic)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 10. Incidents Over Time */}
          <Card className="bg-gradient-to-br from-red-500/5 to-pink-500/5 border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="text-red-700 dark:text-red-400">Zgłoszenia zdarzeń w czasie (ostatnie 30 dni)</CardTitle>
              <CardDescription>Liczba zgłoszeń zdarzeń w ciągu ostatnich 30 dni</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={incidentsOverTime}>
                  <defs>
                    <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="zdarzenia" stroke="#ef4444" fill="url(#colorIncidents)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 11. Traffic by Direction */}
          <Card className="bg-gradient-to-br from-lime-500/5 to-green-500/5 border-lime-200 dark:border-lime-800">
            <CardHeader>
              <CardTitle className="text-lime-700 dark:text-lime-400">Kierunki ruchu - raporty</CardTitle>
              <CardDescription>Rozkład raportów według kierunku jazdy</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={trafficByDirection}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {trafficByDirection.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 12. Incidents by Direction */}
          <Card className="bg-gradient-to-br from-purple-500/5 to-violet-500/5 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="text-purple-700 dark:text-purple-400">Kierunki ruchu - zdarzenia</CardTitle>
              <CardDescription>Rozkład zdarzeń według kierunku jazdy</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incidentsByDirection}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {incidentsByDirection.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 13. Traffic by Hour */}
          <Card className="bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-700 dark:text-blue-400">Raporty ruchu według godzin</CardTitle>
              <CardDescription>Rozkład raportów w ciągu doby</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trafficByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" fontSize={10} angle={-45} textAnchor="end" height={80} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="raporty" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 14. Chat Messages Over Time */}
          <Card className="bg-gradient-to-br from-fuchsia-500/5 to-pink-500/5 border-fuchsia-200 dark:border-fuchsia-800">
            <CardHeader>
              <CardTitle className="text-fuchsia-700 dark:text-fuchsia-400">Aktywność czatu w czasie</CardTitle>
              <CardDescription>Liczba wiadomości w ciągu ostatnich 30 dni</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chatOverTime}>
                  <defs>
                    <linearGradient id="colorChat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="wiadomości" stroke="#ec4899" fill="url(#colorChat)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 15. Top Active Streets Combined */}
          <Card className="lg:col-span-2 bg-gradient-to-br from-sky-500/5 to-blue-500/5 border-sky-200 dark:border-sky-800">
            <CardHeader>
              <CardTitle className="text-sky-700 dark:text-sky-400">Top 10 najbardziej aktywnych ulic</CardTitle>
              <CardDescription>Łączna aktywność: głosy, raporty ruchu, zdarzenia i wiadomości</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topActiveStreets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} fontSize={10} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Głosy" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Ruch" stackId="a" fill="#06b6d4" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Zdarzenia" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Czat" stackId="a" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 16. Traffic Status by Street and Hour */}
          <Card className="lg:col-span-2 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border-yellow-200 dark:border-yellow-800">
            <CardHeader>
              <CardTitle className="text-yellow-700 dark:text-yellow-400">Średni status ruchu według godzin - top 5 ulic</CardTitle>
              <CardDescription>Średni poziom natężenia ruchu w ciągu doby (1=płynny, 2=wolny, 3=zator)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trafficByStreetAndHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" fontSize={10} angle={-45} textAnchor="end" height={80} />
                  <YAxis fontSize={12} domain={[0, 3]} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  {trafficByStreetAndHour.length > 0 && Object.keys(trafficByStreetAndHour[0])
                    .filter(key => key !== 'hour')
                    .map((street, index) => (
                      <Line
                        key={street}
                        type="monotone"
                        dataKey={street}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 16b. Traffic Status by Street and Hour - Date Filtered */}
          <Card className="lg:col-span-2 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 border-amber-200 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="text-amber-700 dark:text-amber-400">Średni status ruchu według godzin - top 5 ulic (wybrana data)</CardTitle>
              <CardDescription>Średni poziom natężenia ruchu w ciągu wybranego dnia (1=płynny, 2=wolny, 3=zator)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Date Picker */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Data</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedHourChartDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedHourChartDate ? format(selectedHourChartDate, "PPP", { locale: pl }) : <span>Wybierz datę</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedHourChartDate}
                          onSelect={(date) => date && setSelectedHourChartDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Street Selector */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Ulica</label>
                    <Select value={selectedHourChartStreet} onValueChange={setSelectedHourChartStreet}>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz ulicę" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Wszystkie (top 5)</SelectItem>
                        {STREETS.map((street) => (
                          <SelectItem key={street} value={street}>
                            {street}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Direction Selector */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Kierunek</label>
                    <Select value={selectedHourChartDirection} onValueChange={setSelectedHourChartDirection}>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz kierunek" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Oba kierunki</SelectItem>
                        <SelectItem value="to_center">Do centrum</SelectItem>
                        <SelectItem value="from_center">Z centrum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trafficByStreetAndHourFiltered}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" fontSize={10} angle={-45} textAnchor="end" height={80} />
                  <YAxis fontSize={12} domain={[0, 3]} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  {trafficByStreetAndHourFiltered.length > 0 && Object.keys(trafficByStreetAndHourFiltered[0])
                    .filter(key => key !== 'hour')
                    .map((street, index) => (
                      <Line
                        key={street}
                        type="monotone"
                        dataKey={street}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>

              {trafficByStreetAndHourFiltered.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Brak danych dla wybranej daty
                </div>
              )}
            </CardContent>
          </Card>

          {/* 17. Traffic Status by Street and Day of Week */}
          <Card className="lg:col-span-2 bg-gradient-to-br from-slate-500/5 to-gray-500/5 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-700 dark:text-slate-400">Średni status ruchu według dni tygodnia - top 5 ulic</CardTitle>
              <CardDescription>Średni poziom natężenia ruchu w poszczególne dni tygodnia (1=płynny, 2=wolny, 3=zator)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={trafficByStreetAndDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" fontSize={10} angle={-45} textAnchor="end" height={80} />
                  <YAxis fontSize={12} domain={[0, 3]} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  {trafficByStreetAndDay.length > 0 && Object.keys(trafficByStreetAndDay[0])
                    .filter(key => key !== 'day')
                    .map((street, index) => (
                      <Bar
                        key={street}
                        dataKey={street}
                        fill={COLORS[index % COLORS.length]}
                        radius={[8, 8, 0, 0]}
                      />
                    ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 18. Traffic Status by Hour - Scatter Chart */}
          <Card className="lg:col-span-2 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-200 dark:border-emerald-800">
            <CardHeader>
              <CardTitle className="text-emerald-700 dark:text-emerald-400">Status ruchu według godziny - wybrana ulica</CardTitle>
              <CardDescription>Punkty pokazują status ruchu, linia pokazuje średnią prędkość w km/h</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {/* Street Selector */}
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Ulica</label>
                  <Select value={selectedStreet} onValueChange={setSelectedStreet}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz ulicę" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStreets.map((street) => (
                        <SelectItem key={street} value={street}>
                          {street}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Direction Selector */}
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Kierunek</label>
                  <Select value={selectedDirection} onValueChange={setSelectedDirection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz kierunek" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to_center">Do centrum</SelectItem>
                      <SelectItem value="from_center">Z centrum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Picker */}
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Data</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: pl }) : <span>Wybierz datę</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    type="number"
                    dataKey="hour"
                    name="Godzina"
                    domain={[0, 24]}
                    ticks={[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]}
                    fontSize={12}
                    label={{ value: 'Godzina', position: 'insideBottom', offset: -5, fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="left"
                    type="number"
                    dataKey="status"
                    name="Status"
                    domain={[-1.5, 1.5]}
                    ticks={[-1, 0, 1]}
                    fontSize={12}
                    tickFormatter={(value) => {
                      if (value === 1) return 'Jedzie';
                      if (value === 0) return 'Toczy się';
                      if (value === -1) return 'Stoi';
                      return '';
                    }}
                    label={{ value: 'Status ruchu', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 60]}
                    fontSize={12}
                    label={{ value: 'Prędkość (km/h)', angle: 90, position: 'insideRight', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border border-border rounded p-2 shadow-lg">
                            {data.statusLabel && <p className="text-sm font-semibold">{data.statusLabel}</p>}
                            {data.time && <p className="text-xs text-muted-foreground">Godzina: {data.time}</p>}
                            {data.speed !== null && data.speed !== undefined && (
                              <p className="text-xs font-semibold text-black">Prędkość: {data.speed.toFixed(1)} km/h</p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  {/* Green dots for status 1 (Jedzie) */}
                  <Scatter
                    yAxisId="left"
                    name="Jedzie"
                    data={trafficStatusScatterData.filter(d => d.status === 1)}
                    fill="#10b981"
                    shape="circle"
                  />
                  {/* Yellow dots for status 0 (Toczy się) */}
                  <Scatter
                    yAxisId="left"
                    name="Toczy się"
                    data={trafficStatusScatterData.filter(d => d.status === 0)}
                    fill="#f59e0b"
                    shape="circle"
                  />
                  {/* Red dots for status -1 (Stoi) */}
                  <Scatter
                    yAxisId="left"
                    name="Stoi"
                    data={trafficStatusScatterData.filter(d => d.status === -1)}
                    fill="#ef4444"
                    shape="circle"
                  />
                  {/* Speed line with black dots - all individual data points */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    data={speedLineData}
                    dataKey="speed"
                    stroke="#000000"
                    strokeWidth={2}
                    dot={{ fill: '#000000', r: 4 }}
                    name="Prędkość (km/h)"
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {trafficStatusScatterData.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Brak danych dla wybranej ulicy, kierunku i daty
                </div>
              )}
            </CardContent>
          </Card>

          {/* 19. Index Page Selected Street Traffic Status */}
          {indexPageStreet && (
            <Card className="lg:col-span-2 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-blue-700 dark:text-blue-400">
                  Raporty ruchu - {indexPageStreet} ({indexPageDirection === 'to_center' ? 'Do centrum' : 'Z centrum'})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      dataKey="hour"
                      name="Godzina"
                      domain={[0, 24]}
                      ticks={[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]}
                      fontSize={12}
                      label={{ value: 'Godzina', position: 'insideBottom', offset: -5, fontSize: 12 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="status"
                      name="Status"
                      domain={[-0.5, 0.5]}
                      ticks={[0]}
                      fontSize={12}
                      tickFormatter={() => ''}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background border border-border rounded p-2 shadow-lg">
                              <p className="text-sm font-semibold">{payload[0].payload.statusLabel}</p>
                              <p className="text-xs text-muted-foreground">Godzina: {payload[0].payload.time}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Green dots for jedzie */}
                    <Scatter
                      data={indexPageScatterData.filter(d => d.rawStatus === 'jedzie')}
                      fill="#10b981"
                      shape="circle"
                    />
                    {/* Yellow dots for toczy_sie */}
                    <Scatter
                      data={indexPageScatterData.filter(d => d.rawStatus === 'toczy_sie')}
                      fill="#f59e0b"
                      shape="circle"
                    />
                    {/* Red dots for stoi */}
                    <Scatter
                      data={indexPageScatterData.filter(d => d.rawStatus === 'stoi')}
                      fill="#ef4444"
                      shape="circle"
                    />
                  </ScatterChart>
                </ResponsiveContainer>

                {indexPageScatterData.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Brak danych dla wybranej ulicy, kierunku i daty
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Statystyki;
