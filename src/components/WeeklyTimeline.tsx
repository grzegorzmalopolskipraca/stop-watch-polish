import { useMemo } from "react";
import { format, addDays, subDays } from "date-fns";
import { pl } from "date-fns/locale";

interface Report {
  status: string;
  reported_at: string;
}

interface WeeklyTimelineProps {
  reports: Report[];
}

const COLORS = {
  stoi: "bg-traffic-stoi",
  toczy_sie: "bg-traffic-toczy",
  jedzie: "bg-traffic-jedzie",
  neutral: "bg-traffic-neutral",
};

export const WeeklyTimeline = ({ reports }: WeeklyTimelineProps) => {
  const weekData = useMemo(() => {
    const now = new Date();
    // Start from 7 days ago to show last 8 days (including today)
    const weekStart = subDays(now, 7);
    
    // Create 8 days × 48 blocks (30-minute intervals)
    const grid: { day: Date; hours: string[] }[] = [];
    
    for (let day = 0; day < 8; day++) {
      const currentDay = addDays(weekStart, day);
      const blocks: string[] = [];
      
      // 48 blocks per day (24 hours * 2)
      for (let block = 0; block < 48; block++) {
        const hour = Math.floor(block / 2);
        const minute = (block % 2) * 30;
        
        const blockStart = new Date(currentDay);
        blockStart.setHours(hour, minute, 0, 0);
        
        const blockEnd = new Date(blockStart);
        blockEnd.setMinutes(blockEnd.getMinutes() + 30);
        
        // Filter reports for this 30-minute block
        const blockReports = reports.filter((r) => {
          const reportTime = new Date(r.reported_at);
          return reportTime >= blockStart && reportTime < blockEnd;
        });
        
        // Calculate majority status
        if (blockReports.length === 0) {
          blocks.push("neutral");
        } else {
          const statusCounts = blockReports.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          const majorityStatus = Object.entries(statusCounts).sort(
            ([, a], [, b]) => b - a
          )[0][0];
          
          blocks.push(majorityStatus);
        }
      }
      
      grid.push({ day: currentDay, hours: blocks });
    }
    
    return grid;
  }, [reports]);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Ruch tygodniowy</h2>
      <p className="text-sm text-muted-foreground">
        Ostatnie 8 dni
      </p>
      
      <div className="space-y-1">
        {weekData.map(({ day, hours }, dayIndex) => (
          <div key={dayIndex} className="flex items-center gap-2">
            <div className="w-8 text-xs text-muted-foreground">
              {format(day, "EEE", { locale: pl })}
            </div>
            <div className="flex-1 flex gap-0.5">
              {hours.map((status, hourIndex) => (
                <div
                  key={hourIndex}
                  className={`flex-1 h-4 rounded-sm transition-colors ${
                    COLORS[status as keyof typeof COLORS]
                  }`}
                  title={`${format(day, "dd.MM")} ${Math.floor(hourIndex / 2)}:${(hourIndex % 2) * 30 === 0 ? '00' : '30'} - ${status}`}
                />
              ))}
            </div>
          </div>
        ))}
        
        {/* Hour scale */}
        <div className="flex items-center gap-2 pt-1">
          <div className="w-8" />
          <div className="flex-1 flex justify-between text-xs text-muted-foreground">
            {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((hour) => (
              <span key={hour} className="text-center" style={{ width: '1ch' }}>
                {hour}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};