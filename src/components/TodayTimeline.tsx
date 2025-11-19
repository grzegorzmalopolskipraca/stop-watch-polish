import { useMemo } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Activity } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Report {
  status: string;
  reported_at: string;
}

interface TodayTimelineProps {
  reports: Report[];
  street: string;
  minSpeed?: number;
  maxSpeed?: number;
}

const COLORS = {
  stoi: "bg-traffic-stoi",
  toczy_sie: "bg-traffic-toczy",
  jedzie: "bg-traffic-jedzie",
  neutral: "bg-traffic-neutral",
};

export const TodayTimeline = ({ reports, street, minSpeed, maxSpeed }: TodayTimelineProps) => {
  const todayData = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    
    const hours: string[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(startOfDay);
      hourStart.setHours(hour);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hour + 1);
      
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
    
    return hours;
  }, [reports]);

  const currentHour = new Date().getHours();

  return (
    <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-orange-50/50 via-white to-orange-50/30 dark:from-orange-950/20 dark:via-background dark:to-orange-900/10 border border-orange-200/50 dark:border-orange-800/30 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-3 rounded-full bg-orange-100 dark:bg-orange-900/30 animate-pulse">
          <Activity className="w-12 h-12 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Dziś: stan ruchu na {street}</h2>
        </div>
      </div>
      
      <div className="space-y-2">
        {/* Enhanced time ruler with more precise markers */}
        <div className="relative h-6 border-b border-muted-foreground/20">
          {Array.from({ length: 25 }, (_, i) => i).map((hour) => {
            const isMainMark = hour % 3 === 0;
            return (
              <div
                key={hour}
                className="absolute bottom-0"
                style={{ left: `${(hour / 24) * 100}%` }}
              >
                <div className={`${isMainMark ? 'h-3 w-0.5' : 'h-2 w-px'} bg-muted-foreground/40`} />
                {isMainMark && (
                  <span className="absolute top-3 text-xs text-muted-foreground -translate-x-1/2 whitespace-nowrap">
                    {hour === 24 ? '23:59' : `${hour}:00`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <TooltipProvider>
          <div className="flex gap-0.5">
            {todayData.map((status, hour) => (
              <Tooltip key={hour} delayDuration={0}>
                <TooltipTrigger asChild>
                  <div
                    className={`flex-1 h-8 rounded transition-all duration-300 hover:scale-110 hover:shadow-md relative cursor-pointer ${
                      COLORS[status as keyof typeof COLORS]
                    } ${hour === currentHour ? "ring-2 ring-primary ring-offset-1" : ""}`}
                  >
                    {hour === currentHour && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-primary" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{hour}:00 - {hour}:59</p>
                  <p className="text-xs text-muted-foreground">{status}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>
      
      {(minSpeed || maxSpeed) && (
        <div className="pt-2 border-t border-border space-y-1">
          {minSpeed && (
            <p className="text-xs text-muted-foreground">
              Minimalna prędkość dzisiaj: <span className="font-medium text-foreground">{minSpeed} km/h</span>
            </p>
          )}
          {maxSpeed && (
            <p className="text-xs text-muted-foreground">
              Maksymalna prędkość dzisiaj: <span className="font-medium text-foreground">{maxSpeed} km/h</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};