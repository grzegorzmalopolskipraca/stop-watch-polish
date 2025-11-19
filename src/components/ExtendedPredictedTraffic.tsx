import { useMemo } from "react";
import { format, addHours, startOfHour, addMinutes, differenceInMinutes } from "date-fns";
import { pl } from "date-fns/locale";
import { predictTrafficIntervals } from "@/utils/trafficPrediction";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Report {
  status: string;
  reported_at: string;
  direction: string;
}

interface ExtendedPredictedTrafficProps {
  reports: Report[];
  direction: string;
}

const COLORS = {
  stoi: "bg-traffic-stoi",
  toczy_sie: "bg-traffic-toczy",
  jedzie: "bg-traffic-jedzie",
  neutral: "bg-traffic-neutral",
};

export const ExtendedPredictedTraffic = ({ reports, direction }: ExtendedPredictedTrafficProps) => {
  const predictionData = useMemo(() => {
    const now = new Date();
    
    // Start from exactly 1 hour in the future from now
    const startTime = addHours(now, 1);
    
    // Predict traffic for the next 10 hours (30 intervals of 20 minutes)
    const intervals = [];
    for (let i = 0; i < 30; i++) {
      const intervalTime = addMinutes(startTime, i * 20);
      // Use the prediction function with a midpoint check for each 20-minute interval
      const predictions = predictTrafficIntervals(reports, direction, intervalTime, 1);
      intervals.push({
        time: intervalTime,
        status: predictions[0]?.status || 'neutral'
      });
    }
    
    return intervals;
  }, [reports, direction]);
  
  // Generate legend times (every hour, rounded to 5-minute marks)
  const legendTimes = useMemo(() => {
    const now = new Date();
    const futureTime = addHours(now, 1);
    
    // Round to nearest 5 minutes
    const currentMinute = futureTime.getMinutes();
    const roundedMinute = Math.round(currentMinute / 5) * 5;
    const startTime = new Date(futureTime.getFullYear(), futureTime.getMonth(), futureTime.getDate(), futureTime.getHours(), roundedMinute, 0);
    
    const times = [];
    for (let i = 0; i <= 10; i += 1) {
      const time = addHours(startTime, i);
      times.push(format(time, "HH:mm", { locale: pl }));
    }
    
    return times;
  }, []);

  return (
    <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 dark:from-purple-950/20 dark:via-background dark:to-purple-900/10 border border-purple-200/50 dark:border-purple-800/30 shadow-lg">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Prognoza na dalsze godziny</h2>
        <p className="text-sm text-muted-foreground mt-1">Planuj swoją podróż z wyprzedzeniem</p>
      </div>
      
      <div className="relative">
        {/* Enhanced time ruler with precise markers */}
        <div className="relative h-6 mb-2 border-b border-muted-foreground/20">
          {legendTimes.map((time, index) => {
            const position = (index * 100) / 10;
            const isMainMark = index % 2 === 0;
            return (
              <div
                key={index}
                className="absolute bottom-0"
                style={{ left: `${position}%` }}
              >
                <div className={`${isMainMark ? 'h-3 w-0.5' : 'h-2 w-px'} bg-muted-foreground/40`} />
                {isMainMark && (
                  <span className="absolute top-3 text-xs text-muted-foreground -translate-x-1/2 whitespace-nowrap">
                    {time}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Timeline with tooltips */}
        <TooltipProvider>
          <div className="flex gap-0.5">
            {predictionData.map((interval, index) => (
              <Tooltip key={index} delayDuration={0}>
                <TooltipTrigger asChild>
                  <div
                    className={`flex-1 h-6 rounded-sm transition-all duration-300 hover:scale-110 hover:shadow-md cursor-pointer ${
                      COLORS[interval.status as keyof typeof COLORS]
                    }`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{format(interval.time, "HH:mm", { locale: pl })}</p>
                  <p className="text-xs text-muted-foreground">{interval.status}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
};
