import { useMemo } from "react";
import { format, startOfDay } from "date-fns";
import { pl } from "date-fns/locale";

interface Report {
  status: string;
  reported_at: string;
}

interface GreenWaveProps {
  reports: Report[];
}

interface TimeRange {
  start: string;
  end: string;
  durationMinutes: number;
  status: 'stoi' | 'toczy_sie' | 'jedzie';
}

export const GreenWave = ({ reports }: GreenWaveProps) => {
  const greenWaveRanges = useMemo(() => {
    if (!reports || reports.length === 0) {
      return [];
    }

    // Filter reports to only today and past 7 days
    const today = startOfDay(new Date());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const relevantReports = reports.filter((r) => {
      const reportDate = new Date(r.reported_at);
      return reportDate >= weekAgo && reportDate <= new Date();
    });

    // Use 10-minute intervals (144 intervals per day: 24 hours * 6)
    interface IntervalStatus {
      time: string;
      averageStatus: 'stoi' | 'toczy_sie' | 'jedzie';
    }
    
    const resultStatusList: IntervalStatus[] = [];

    // Process each 10-minute interval
    for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += 10) {
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      const endMinutes = totalMinutes + 10;

      // Count statuses in this 10-minute window
      let countStatusStoi = 0;
      let countStatusToczySie = 0;
      let countStatusJedzie = 0;

      relevantReports.forEach((r) => {
        const reportDate = new Date(r.reported_at);
        const reportTotalMinutes = reportDate.getHours() * 60 + reportDate.getMinutes();
        
        if (reportTotalMinutes >= totalMinutes && reportTotalMinutes < endMinutes) {
          if (r.status === "stoi") {
            countStatusStoi++;
          } else if (r.status === "toczy_sie") {
            countStatusToczySie++;
          } else if (r.status === "jedzie") {
            countStatusJedzie++;
          }
        }
      });

      // Determine average status (highest count, default to jedzie if all zero)
      let averageStatus: 'stoi' | 'toczy_sie' | 'jedzie' = 'jedzie';
      
      if (countStatusStoi === 0 && countStatusToczySie === 0 && countStatusJedzie === 0) {
        averageStatus = 'jedzie';
      } else if (countStatusStoi >= countStatusToczySie && countStatusStoi >= countStatusJedzie) {
        averageStatus = 'stoi';
      } else if (countStatusToczySie >= countStatusStoi && countStatusToczySie >= countStatusJedzie) {
        averageStatus = 'toczy_sie';
      } else {
        averageStatus = 'jedzie';
      }

      resultStatusList.push({
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        averageStatus,
      });
    }

    // Group consecutive periods of the same status
    const ranges: TimeRange[] = [];
    let rangeStart: string | null = null;
    let rangeStartMinutes = 0;
    let currentStatus: 'stoi' | 'toczy_sie' | 'jedzie' | null = null;

    resultStatusList.forEach((item, index) => {
      if (rangeStart === null) {
        // Start a new range
        rangeStart = item.time;
        rangeStartMinutes = index * 10;
        currentStatus = item.averageStatus;
      } else if (item.averageStatus !== currentStatus) {
        // Status changed, close current range and start new one
        const endMinutes = index * 10;
        const durationMinutes = endMinutes - rangeStartMinutes;
        
        ranges.push({
          start: rangeStart,
          end: item.time,
          durationMinutes,
          status: currentStatus!,
        });
        
        rangeStart = item.time;
        rangeStartMinutes = index * 10;
        currentStatus = item.averageStatus;
      }
    });

    // Handle the last range that extends to end of day
    if (rangeStart !== null && currentStatus !== null) {
      const endMinutes = 24 * 60;
      const durationMinutes = endMinutes - rangeStartMinutes;
      
      ranges.push({
        start: rangeStart,
        end: '24:00',
        durationMinutes,
        status: currentStatus,
      });
    }

    return ranges;
  }, [reports]);

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

  if (greenWaveRanges.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Zielona fala</h2>
        <p className="text-sm text-muted-foreground">
          Brak danych o płynnym ruchu w ciągu ostatniego tygodnia
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Zielona fala</h2>
      <p className="text-sm text-muted-foreground">
        Korzystaj z zielonej fali i wyjeżdżaj z domu w czasie mniejszego ruchu. Szybciej zajedziesz i odciążysz korki. Informuj jak wygląda ruch na Twojej ulicy a Zielona Fala będzie się aktualizować
      </p>
      <p className="text-sm text-muted-foreground">
        (Zielona fala dopiero zbiera dane. Mogą jeszcze nie być dokładne, zależne są od prawidłowych zgłoszeń)
      </p>
      <p className="text-sm font-semibold">
        Stan ruchu w ciągu dnia:
      </p>
      
      <div className="space-y-2">
        {greenWaveRanges.map((range, index) => {
          const bgColor = range.status === 'jedzie' 
            ? 'bg-traffic-jedzie/10 border-traffic-jedzie/20' 
            : range.status === 'stoi'
            ? 'bg-traffic-stoi/10 border-traffic-stoi/20'
            : 'bg-traffic-toczy/10 border-traffic-toczy/20';
          
          return (
            <div 
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border ${bgColor}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {range.start}
                </span>
                <span className="text-muted-foreground">do</span>
                <span className="text-sm font-medium">
                  {range.end}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDuration(range.durationMinutes)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
