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

    // Use 15-minute blocks (96 blocks per day: 24 hours * 4)
    const blockStatus: Record<number, { stoi: number; toczy_sie: number; jedzie: number }> = {};
    
    for (let block = 0; block < 96; block++) {
      blockStatus[block] = { stoi: 0, toczy_sie: 0, jedzie: 0 };
    }

    relevantReports.forEach((r) => {
      const reportDate = new Date(r.reported_at);
      const hour = reportDate.getHours();
      const minute = reportDate.getMinutes();
      const block = Math.floor((hour * 60 + minute) / 15);
      
      if (r.status === "stoi") {
        blockStatus[block].stoi++;
      } else if (r.status === "toczy_sie") {
        blockStatus[block].toczy_sie++;
      } else if (r.status === "jedzie") {
        blockStatus[block].jedzie++;
      }
    });

    // Find green wave periods (blocks where stoi and toczy_sie are 0)
    const greenBlocks: boolean[] = [];
    for (let block = 0; block < 96; block++) {
      const status = blockStatus[block];
      const totalBad = status.stoi + status.toczy_sie;
      const totalGood = status.jedzie;
      
      // Green wave if: no bad reports and at least some good reports
      const isGreen = totalBad === 0 && totalGood > 0;
      greenBlocks.push(isGreen);
    }

    // Merge consecutive green blocks into ranges
    const ranges: TimeRange[] = [];
    let rangeStart: number | null = null;

    for (let block = 0; block < 96; block++) {
      if (greenBlocks[block]) {
        if (rangeStart === null) {
          rangeStart = block;
        }
      } else {
        if (rangeStart !== null) {
          const startMinutes = rangeStart * 15;
          const endMinutes = block * 15;
          
          ranges.push({
            start: `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}`,
            end: `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`,
            durationMinutes: endMinutes - startMinutes,
          });
          rangeStart = null;
        }
      }
    }

    // Handle case where green wave extends to end of day
    if (rangeStart !== null) {
      const startMinutes = rangeStart * 15;
      const endMinutes = 24 * 60;
      
      ranges.push({
        start: `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}`,
        end: '24:00',
        durationMinutes: endMinutes - startMinutes,
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
        Najlepiej jechać w godzinach
      </p>
      
      <div className="space-y-2">
        {greenWaveRanges.map((range, index) => (
          <div 
            key={index}
            className="flex items-center justify-between p-3 bg-traffic-jedzie/10 rounded-lg border border-traffic-jedzie/20"
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
        ))}
      </div>
    </div>
  );
};
