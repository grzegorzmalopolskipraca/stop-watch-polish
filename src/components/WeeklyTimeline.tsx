import { useMemo } from "react";
import { format, addDays, subDays } from "date-fns";
import { pl } from "date-fns/locale";
import { calculateWeeklyTrafficBlocks } from "@/utils/trafficCalculations";
import { Calendar } from "lucide-react";

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
    // Get weekly data including today (last 7 days)
    const weeklyData = calculateWeeklyTrafficBlocks(reports);
    
    // Convert to display format
    const grid = weeklyData.map(dayData => ({
      day: dayData.day,
      hours: dayData.blocks.map(b => b.status)
    }));
    
    return grid;
  }, [reports]);

  return (
    <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 dark:from-purple-950/20 dark:via-background dark:to-purple-900/10 border border-purple-200/50 dark:border-purple-800/30 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 animate-pulse">
          <Calendar className="w-12 h-12 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Ruch tygodniowy</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ostatnie 7 dni
          </p>
        </div>
      </div>
      
      <div className="space-y-1">
        {weekData.map(({ day, hours }, dayIndex) => (
          <div key={dayIndex} className="flex items-center gap-2">
            <div className="w-8 text-xs text-muted-foreground">
              {dayIndex === 6 ? "dziś" : format(day, "EEE", { locale: pl })}
            </div>
            <div className="flex-1 flex gap-0.5">
              {hours.map((status, hourIndex) => (
                <div
                  key={hourIndex}
                  className={`flex-1 h-4 rounded-sm transition-all duration-300 hover:scale-110 hover:shadow-md ${
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