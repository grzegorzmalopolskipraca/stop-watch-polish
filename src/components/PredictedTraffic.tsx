import { useMemo } from "react";
import { format, differenceInMinutes } from "date-fns";
import { pl } from "date-fns/locale";
import { predictTrafficIntervals } from "@/utils/trafficPrediction";

interface Report {
  status: string;
  reported_at: string;
  direction: string;
}

interface PredictedTrafficProps {
  reports: Report[];
  direction: string;
}

const COLORS = {
  stoi: "bg-traffic-stoi",
  toczy_sie: "bg-traffic-toczy",
  jedzie: "bg-traffic-jedzie",
  neutral: "bg-traffic-neutral",
};

export const PredictedTraffic = ({ reports, direction }: PredictedTrafficProps) => {
  const { predictionData, minutesToNextStoi, currentIsStoi } = useMemo(() => {
    const now = new Date();

    // Predict traffic for the next hour (12 intervals of 5 minutes)
    const intervals = predictTrafficIntervals(reports, direction, now, 12);
    
    // Check if current status is 'stoi' (first interval)
    const currentIsStoi = intervals[0]?.status === 'stoi';
    
    // Find minutes to next 'stoi' status
    let minutesToNextStoi = null;
    for (let i = 0; i < intervals.length; i++) {
      if (intervals[i].status === 'stoi') {
        minutesToNextStoi = differenceInMinutes(intervals[i].time, now);
        break;
      }
    }
    
    return { predictionData: intervals, minutesToNextStoi, currentIsStoi };
  }, [reports, direction]);
  
  // Generate legend times (every 10 minutes)
  const legendTimes = useMemo(() => {
    const now = new Date();
    const currentMinute = now.getMinutes();
    const currentHour = now.getHours();
    
    // Round to nearest 5 minutes
    const roundedMinute = Math.floor(currentMinute / 5) * 5;
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour, roundedMinute, 0);
    
    const times = [];
    for (let i = 0; i <= 60; i += 10) {
      const time = new Date(startTime.getTime() + i * 60 * 1000);
      times.push(format(time, "HH:mm", { locale: pl }));
    }
    
    return times;
  }, []);

  return (
    <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 dark:from-blue-950/20 dark:via-background dark:to-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 shadow-lg">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Prognoza na najbliższą godzinę</h2>
        <p className="text-sm text-muted-foreground mt-1">Wyjedź, kiedy masz zielone</p>
        {!currentIsStoi && minutesToNextStoi !== null && minutesToNextStoi > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Następny korek za {minutesToNextStoi} minut
          </p>
        )}
      </div>
      
      <div className="relative">
        {/* Time legend - labels above (even indices) */}
        <div className="relative h-5 mb-1">
          {legendTimes.map((time, index) => {
            // Only show even-indexed labels (0, 2, 4, 6) above
            if (index % 2 !== 0) return null;

            const isFirst = index === 0;
            const isLast = index === legendTimes.length - 1;
            // Each legend item represents 10 minutes, rectangles are 5 minutes
            // So legend index i should be at position (i * 10) / 60 = i / 6 of total width
            const position = (index * 100) / 6;

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

        {/* Timeline */}
        <div className="flex gap-0.5">
          {predictionData.map((interval, index) => (
            <div
              key={index}
              className={`flex-1 h-6 rounded-sm transition-all duration-300 hover:scale-110 hover:shadow-md ${
                COLORS[interval.status as keyof typeof COLORS]
              }`}
              title={`${format(interval.time, "HH:mm", { locale: pl })} - ${interval.status}`}
            />
          ))}
        </div>

        {/* Time legend - labels below (odd indices) */}
        <div className="relative h-5 mt-1">
          {legendTimes.map((time, index) => {
            // Only show odd-indexed labels (1, 3, 5) below
            if (index % 2 === 0) return null;

            const isFirst = index === 0;
            const isLast = index === legendTimes.length - 1;
            const position = (index * 100) / 6;

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
