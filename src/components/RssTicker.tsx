import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RssItem {
  id: string;
  text: string;
  position: number;
}

interface IncidentReport {
  id: string;
  street: string;
  incident_type: string;
  reported_at: string;
}

export const RssTicker = () => {
  const [items, setItems] = useState<RssItem[]>([]);
  const [speed, setSpeed] = useState(60);
  const [incidentTexts, setIncidentTexts] = useState<string[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('rss_ticker_settings')
        .select('speed')
        .maybeSingle();
      
      if (data) {
        setSpeed(data.speed);
      }
    };

    fetchSettings();

    // Subscribe to settings changes
    const settingsChannel = supabase
      .channel('rss_ticker_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rss_ticker_settings'
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
    };
  }, []);

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

  useEffect(() => {
    const fetchIncidents = async () => {
      const incidentTypes = ['Blokada', 'Wypadek', 'Objazd', 'Roboty', 'Ślisko', 'Dziury', 'Zwierze', 'Awaria'];
      const allReports: IncidentReport[] = [];

      // Fetch incidents for each type with its specific time window
      for (const incidentType of incidentTypes) {
        const hoursAgo = getIncidentTimeWindow(incidentType);
        const timeAgo = new Date();
        timeAgo.setHours(timeAgo.getHours() - hoursAgo);

        const { data, error } = await supabase
          .from('incident_reports')
          .select('*')
          .eq('incident_type', incidentType)
          .gte('reported_at', timeAgo.toISOString());
        
        if (!error && data) {
          allReports.push(...data);
        }
      }
      
      // Group by street and incident_type
      const grouped = allReports.reduce((acc: Record<string, Record<string, number>>, report: IncidentReport) => {
        if (!acc[report.street]) {
          acc[report.street] = {};
        }
        if (!acc[report.street][report.incident_type]) {
          acc[report.street][report.incident_type] = 0;
        }
        acc[report.street][report.incident_type]++;
        return acc;
      }, {});
      
      // Generate incident texts
      const texts: string[] = [];
      Object.entries(grouped).forEach(([street, incidents]) => {
        Object.entries(incidents).forEach(([incidentType, count]) => {
          texts.push(`       ⚠️ Uwaga ${incidentType} na drodze ${street} liczba potwierdzeń zdarzenia ${count}       `);
        });
      });
      
      setIncidentTexts(texts);
    };

    fetchIncidents();

    // Subscribe to realtime updates for incidents
    const incidentsChannel = supabase
      .channel('incident_reports_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incident_reports'
        },
        () => {
          fetchIncidents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(incidentsChannel);
    };
  }, []);

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('rss_items')
        .select('*')
        .order('position', { ascending: true });
      
      if (error) {
        console.error('Error fetching RSS items:', error);
        return;
      }
      
      if (data) {
        setItems(data);
      }
    };

    fetchItems();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('rss_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rss_items'
        },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Combine incident texts with RSS items
  const allItems = [
    ...incidentTexts.map((text, index) => ({ id: `incident-${index}`, text, position: -1 })),
    ...items
  ];

  if (allItems.length === 0) return null;

  // Duplicate items to create seamless loop
  const duplicatedItems = [...allItems, ...allItems];

  return (
    <div className="w-full bg-primary/10 overflow-hidden border-b border-border">
      <div className="relative h-8 flex items-center overflow-hidden">
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes scroll-left {
              0% { transform: translateX(100%); }
              100% { transform: translateX(-100%); }
            }
            .animate-scroll-left {
              animation: scroll-left ${speed}s linear infinite;
            }
            .animate-scroll-left:hover {
              animation-play-state: paused;
            }
          `
        }} />
        <div className="flex gap-32 animate-scroll-left whitespace-nowrap text-sm">
          {duplicatedItems.map((item, index) => (
            <span key={`${item.id}-${index}`} className="text-foreground/80">
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
