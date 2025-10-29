import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { format, parseISO, getHours } from "date-fns";
import { pl } from "date-fns/locale";

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'];
const GRADIENT_COLORS = [
  { start: '#8b5cf6', end: '#6366f1' },
  { start: '#06b6d4', end: '#0891b2' },
  { start: '#10b981', end: '#059669' },
  { start: '#f59e0b', end: '#d97706' },
  { start: '#ef4444', end: '#dc2626' },
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

  useEffect(() => {
    fetchAllStatistics();
  }, []);

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
        smooth: "Płynny",
        slow: "Wolny",
        congested: "Zator",
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
      .order("reported_at", { ascending: true });
    
    if (trafficTimeData) {
      const dateCounts: Record<string, number> = {};
      trafficTimeData.forEach((t) => {
        const date = format(parseISO(t.reported_at), "yyyy-MM-dd");
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      });
      
      setTrafficOverTime(
        Object.entries(dateCounts)
          .slice(-30)
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
            <h1 className="text-2xl font-bold text-foreground">Statystyki eJedzie.pl</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Total Visits Card */}
        <Card className="mb-8 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-3xl text-center bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Łączna liczba wizyt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-6xl font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
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
        </div>
      </main>
    </div>
  );
};

export default Statystyki;
