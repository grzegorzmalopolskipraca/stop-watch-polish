import { useMemo } from "react";
import { format, addDays, subDays } from "date-fns";
import { pl } from "date-fns/locale";
import { calculateWeeklyTrafficBlocks } from "@/utils/trafficCalculations";
import { Calendar } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
        <TooltipProvider>
          {weekData.map(({ day, hours }, dayIndex) => (
            <div key={dayIndex} className="flex items-center gap-2">
              <div className="w-8 text-xs text-muted-foreground">
                {dayIndex === 6 ? "dziś" : format(day, "EEE", { locale: pl })}
              </div>
              <div className="flex-1 flex gap-0.5">
                {hours.map((status, hourIndex) => {
                  const hour = 5 + Math.floor(hourIndex / 2);
                  const minute = (hourIndex % 2) * 30;
                  return (
                    <Tooltip key={hourIndex} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex-1 h-4 rounded-sm transition-all duration-300 hover:scale-110 hover:shadow-md cursor-pointer ${
                            COLORS[status as keyof typeof COLORS]
                          }`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{format(day, "dd.MM")} {hour}:{minute === 0 ? '00' : minute}</p>
                        <p className="text-xs text-muted-foreground">{status}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}
        </TooltipProvider>
        
        {/* Enhanced hour scale ruler */}
        <div className="flex items-center gap-2 pt-2">
          <div className="w-8" />
          <div className="flex-1 relative h-6 border-t border-muted-foreground/20">
            {[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((hour, idx) => {
              const position = ((hour - 5) / 18) * 100;
              const isMainMark = hour % 3 === 5 || hour % 3 === 2;
              return (
                <div
                  key={hour}
                  className="absolute top-0"
                  style={{ left: `${position}%` }}
                >
                  <div className={`${isMainMark ? 'h-3 w-0.5' : 'h-2 w-px'} bg-muted-foreground/40`} />
                  {isMainMark && (
                    <span className="absolute top-3 text-xs text-muted-foreground -translate-x-1/2 whitespace-nowrap">
                      {hour}:00
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};