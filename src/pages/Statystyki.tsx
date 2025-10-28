import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

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
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl text-center">Łączna liczba wizyt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-6xl font-bold text-center text-primary">{totalVisits.toLocaleString("pl-PL")}</p>
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Daily Visits Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Wizyty dzienne (ostatnie 30 dni)</CardTitle>
              <CardDescription>Liczba odwiedzin strony w ciągu ostatnich 30 dni</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyVisits}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="wizyty" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 2. Top Streets Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 ulic - głosowanie</CardTitle>
              <CardDescription>Ulice z największą liczbą głosów</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topStreets}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="votes" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 3. Top Cities Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 miast - głosowanie</CardTitle>
              <CardDescription>Miasta z największą liczbą głosów</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCities}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="votes" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 4. Traffic by Status Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Raporty ruchu według statusu</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle>Top 10 ulic - raporty ruchu</CardTitle>
              <CardDescription>Ulice z największą liczbą raportów</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trafficByStreet}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="raporty" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 6. Incidents by Type Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Zdarzenia według typu</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle>Top 10 ulic - zgłoszenia zdarzeń</CardTitle>
              <CardDescription>Ulice z największą liczbą zgłoszeń</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incidentsByStreet}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="zdarzenia" fill="#ff7c7c" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 8. Chat Activity by Street Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 ulic - aktywność czatu</CardTitle>
              <CardDescription>Ulice z największą liczbą wiadomości</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chatActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="wiadomości" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 9. Traffic Reports Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Raporty ruchu w czasie (ostatnie 30 dni)</CardTitle>
              <CardDescription>Liczba raportów ruchu w ciągu ostatnich 30 dni</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trafficOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="raporty" stroke="#ffc658" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 10. Incidents Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Zgłoszenia zdarzeń w czasie (ostatnie 30 dni)</CardTitle>
              <CardDescription>Liczba zgłoszeń zdarzeń w ciągu ostatnich 30 dni</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={incidentsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="zdarzenia" stroke="#ff7c7c" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Statystyki;
