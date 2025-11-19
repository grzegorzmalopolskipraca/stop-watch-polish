import { useMemo, useState, useEffect, useRef } from "react";
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSelectedIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

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
        {/* Time legend - labels above (even indices) */}
        <div className="relative h-5 mb-1">
          {legendTimes.map((time, index) => {
            // Only show even-indexed labels (0, 2, 4) above
            if (index % 2 !== 0) return null;

            const isFirst = index === 0;
            const isLast = index === legendTimes.length - 1;
            const position = (index * 100) / 10;

            return (
              <span
                key={index}
                className="text-xs text-muted-foreground absolute bottom-0"
                style={{
                  left: `${position}%`,
                  transform: isFirst ? 'translateX(0)' : isLast ? 'translateX(-100%)' : 'translateX(-50%)'
                }}
              >
                {time}
              </span>
            );
          })}
        </div>

        {/* Timeline with tooltips */}
        <TooltipProvider>
          <div className="flex gap-0.5 relative" ref={containerRef}>
            {predictionData.map((interval, index) => (
              <Tooltip key={index} delayDuration={0}>
                <TooltipTrigger asChild>
                  <div
                    className={`flex-1 h-6 rounded-sm transition-all duration-300 hover:scale-110 hover:shadow-md cursor-pointer ${
                      COLORS[interval.status as keyof typeof COLORS]
                    } ${selectedIndex === index ? 'scale-110 shadow-md ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedIndex(selectedIndex === index ? null : index)}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setSelectedIndex(selectedIndex === index ? null : index);
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{format(interval.time, "HH:mm", { locale: pl })}</p>
                  <p className="text-xs text-muted-foreground">{interval.status}</p>
                </TooltipContent>
              </Tooltip>
            ))}

            {/* Mobile tooltip display - positioned above */}
            {selectedIndex !== null && predictionData[selectedIndex] && (
              <div
                className="absolute bottom-full mb-2 p-2 bg-background border border-border rounded shadow-lg text-center sm:hidden w-auto whitespace-nowrap"
                style={{
                  left: `${(selectedIndex / predictionData.length) * 100}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                <p className="font-medium">{format(predictionData[selectedIndex].time, "HH:mm", { locale: pl })}</p>
                <p className="text-xs text-muted-foreground">{predictionData[selectedIndex].status}</p>
              </div>
            )}
          </div>
        </TooltipProvider>

        {/* Time legend - labels below (odd indices) */}
        <div className="relative h-5 mt-1">
          {legendTimes.map((time, index) => {
            // Only show odd-indexed labels (1, 3, 5) below
            if (index % 2 === 0) return null;

            const isFirst = index === 0;
            const isLast = index === legendTimes.length - 1;
            const position = (index * 100) / 10;

            return (
              <span
                key={index}
                className="text-xs text-muted-foreground absolute top-0"
                style={{
                  left: `${position}%`,
                  transform: isFirst ? 'translateX(0)' : isLast ? 'translateX(-100%)' : 'translateX(-50%)'
                }}
              >
                {time}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
