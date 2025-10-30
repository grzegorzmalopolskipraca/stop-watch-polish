import { useMemo } from "react";
import { format, addDays, subDays } from "date-fns";
import { pl } from "date-fns/locale";
import { calculateWeeklyTrafficBlocks } from "@/utils/trafficCalculations";

interface Report {
  status: string;
  reported_at: string;
  direction: string;
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
    const weeklyData = calculateWeeklyTrafficBlocks(reports);
    
    // Add today to show 8 days total
    const today = new Date();
    const startHour = 5;
    const endHour = 22;
    const totalBlocks = (endHour - startHour) * 2;
    
    const todayBlocks: string[] = [];
    for (let block = 0; block < totalBlocks; block++) {
      const hour = startHour + Math.floor(block / 2);
      const minute = (block % 2) * 30;
      
      const blockStart = new Date(today);
      blockStart.setHours(hour, minute, 0, 0);
      
      const blockEnd = new Date(blockStart);
      blockEnd.setMinutes(blockEnd.getMinutes() + 30);
      
      const blockReports = reports.filter((r) => {
        const reportTime = new Date(r.reported_at);
        return reportTime >= blockStart && reportTime < blockEnd;
      });
      
      if (blockReports.length === 0) {
        todayBlocks.push("neutral");
      } else {
        const statusCounts = blockReports.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const majorityStatus = Object.entries(statusCounts).sort(
          ([, a], [, b]) => b - a
        )[0][0];
        
        todayBlocks.push(majorityStatus);
      }
    }
    
    // Convert weekly data to old format
    const grid = weeklyData.map(dayData => ({
      day: dayData.day,
      hours: dayData.blocks.map(b => b.status)
    }));
    
    // Add today
    grid.push({ day: today, hours: todayBlocks });
    
    return grid;
  }, [reports]);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Ruch tygodniowy</h2>
      <p className="text-sm text-muted-foreground">
        Ostatnie 7 dni
      </p>
      
      <div className="space-y-1">
        {weekData.map(({ day, hours }, dayIndex) => (
          <div key={dayIndex} className="flex items-center gap-2">
            <div className="w-8 text-xs text-muted-foreground">
              {dayIndex === 7 ? "dziś" : format(day, "EEE", { locale: pl })}
            </div>
            <div className="flex-1 flex gap-0.5">
              {hours.map((status, hourIndex) => (
                <div
                  key={hourIndex}
                  className={`flex-1 h-4 rounded-sm transition-colors ${
                    COLORS[status as keyof typeof COLORS]
                  }`}
                  title={`${format(day, "dd.MM")} ${5 + Math.floor(hourIndex / 2)}:${(hourIndex % 2) * 30 === 0 ? '00' : '30'} - ${status}`}
                />
              ))}
            </div>
          </div>
        ))}
        
        {/* Hour scale */}
        <div className="flex items-center gap-2 pt-1">
          <div className="w-8" />
          <div className="flex-1 flex justify-between text-xs text-muted-foreground">
            {[5, 8, 11, 14, 17, 20, 22].map((hour) => (
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