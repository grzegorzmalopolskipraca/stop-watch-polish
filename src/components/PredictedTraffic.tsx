import { useMemo } from "react";
import { addMinutes, format, differenceInMinutes } from "date-fns";
import { pl } from "date-fns/locale";

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
    const currentMinute = now.getMinutes();
    const currentHour = now.getHours();

    // Round to nearest 5 minutes
    const roundedMinute = Math.floor(currentMinute / 5) * 5;
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour, roundedMinute, 0);

    // Get today's day of week (0 = Sunday, 1 = Monday, etc.)
    const todayDayOfWeek = now.getDay();

    // Filter reports to ALL historical data from the same day of week and direction
    // For example, if today is Monday, this includes ALL Mondays from the historical data (last 4 weeks)
    // This aggregates data from multiple weeks for better predictions
    const relevantReports = reports.filter(r => {
      const reportDate = new Date(r.reported_at);
      return reportDate.getDay() === todayDayOfWeek && r.direction === direction;
    });
    
    // Create 5-minute intervals for next hour (12 intervals)
    const intervals = [];
    for (let i = 0; i < 12; i++) {
      const intervalStart = addMinutes(startTime, i * 5);
      const intervalEnd = addMinutes(intervalStart, 5);

      // Get ALL historical reports from this time window (from all matching days of week)
      // For example, if interval is 10:00-10:05 on Monday, this includes reports from
      // 10:00-10:05 on ALL previous Mondays in the historical data
      const intervalReports = relevantReports.filter(r => {
        const reportDate = new Date(r.reported_at);
        const reportMinutes = reportDate.getHours() * 60 + reportDate.getMinutes();
        const intervalStartMinutes = intervalStart.getHours() * 60 + intervalStart.getMinutes();
        const intervalEndMinutes = intervalEnd.getHours() * 60 + intervalEnd.getMinutes();

        return reportMinutes >= intervalStartMinutes && reportMinutes < intervalEndMinutes;
      });
      
      // Determine majority status for this 5-minute interval
      // If no reports exist for this specific time window, status remains 'neutral' (grey)
      // This can happen if users didn't report during this exact 5-minute window
      let status = 'neutral';
      if (intervalReports.length > 0) {
        const statusCounts = {
          stoi: 0,
          toczy_sie: 0,
          jedzie: 0,
        };

        intervalReports.forEach(r => {
          if (r.status === 'stoi') statusCounts.stoi++;
          else if (r.status === 'toczy_sie') statusCounts.toczy_sie++;
          else if (r.status === 'jedzie') statusCounts.jedzie++;
        });

        // Find status with highest count (majority wins)
        if (statusCounts.stoi >= statusCounts.toczy_sie && statusCounts.stoi >= statusCounts.jedzie) {
          status = 'stoi';
        } else if (statusCounts.toczy_sie >= statusCounts.stoi && statusCounts.toczy_sie >= statusCounts.jedzie) {
          status = 'toczy_sie';
        } else {
          status = 'jedzie';
        }
      }
      
      intervals.push({
        time: intervalStart,
        status,
      });
    }
    
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
      const time = addMinutes(startTime, i);
      times.push(format(time, "HH:mm", { locale: pl }));
    }
    
    return times;
  }, []);

  return (
    <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 dark:from-blue-950/20 dark:via-background dark:to-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 shadow-lg">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Ruch w najbliższej godzinie</h2>
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
