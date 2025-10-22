import { useMemo } from "react";
import { format, startOfWeek, addDays, addHours } from "date-fns";
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
    const weekStart = startOfWeek(now, { locale: pl, weekStartsOn: 1 });
    
    // Create 7 days × 24 hours grid
    const grid: { day: Date; hours: string[] }[] = [];
    
    for (let day = 0; day < 7; day++) {
      const currentDay = addDays(weekStart, day);
      const hours: string[] = [];
      
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = addHours(new Date(currentDay.setHours(hour, 0, 0, 0)), 0);
        const hourEnd = addHours(hourStart, 1);
        
        // Filter reports for this hour
        const hourReports = reports.filter((r) => {
          const reportTime = new Date(r.reported_at);
          return reportTime >= hourStart && reportTime < hourEnd;
        });
        
        // Calculate majority status
        if (hourReports.length === 0) {
          hours.push("neutral");
        } else {
          const statusCounts = hourReports.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          const majorityStatus = Object.entries(statusCounts).sort(
            ([, a], [, b]) => b - a
          )[0][0];
          
          hours.push(majorityStatus);
        }
      }
      
      grid.push({ day: currentDay, hours });
    }
    
    return grid;
  }, [reports]);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Ruch tygodniowy</h2>
      <p className="text-sm text-muted-foreground">
        Średnia z ostatniego tygodnia
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
                  title={`${format(day, "dd.MM")} ${hourIndex}:00 - ${status}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};