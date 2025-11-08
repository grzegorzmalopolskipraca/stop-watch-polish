import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { addMinutes, format, subWeeks, startOfMinute } from "date-fns";
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
  const predictionData = useMemo(() => {
    const now = new Date();
    const currentMinute = now.getMinutes();
    const currentHour = now.getHours();
    
    // Round to nearest 5 minutes
    const roundedMinute = Math.floor(currentMinute / 5) * 5;
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour, roundedMinute, 0);
    
    // Get data from one week ago
    const oneWeekAgo = subWeeks(now, 1);
    const oneWeekAgoDay = oneWeekAgo.getDay();
    
    // Filter reports from same day of week, one week ago, and same direction
    const relevantReports = reports.filter(r => {
      const reportDate = new Date(r.reported_at);
      return reportDate.getDay() === oneWeekAgoDay && r.direction === direction;
    });
    
    // Create 5-minute intervals for next hour (12 intervals)
    const intervals = [];
    for (let i = 0; i < 12; i++) {
      const intervalStart = addMinutes(startTime, i * 5);
      const intervalEnd = addMinutes(intervalStart, 5);
      
      // Get reports from this time range one week ago
      const intervalReports = relevantReports.filter(r => {
        const reportDate = new Date(r.reported_at);
        const reportMinutes = reportDate.getHours() * 60 + reportDate.getMinutes();
        const intervalStartMinutes = intervalStart.getHours() * 60 + intervalStart.getMinutes();
        const intervalEndMinutes = intervalEnd.getHours() * 60 + intervalEnd.getMinutes();
        
        return reportMinutes >= intervalStartMinutes && reportMinutes < intervalEndMinutes;
      });
      
      // Determine majority status
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
        
        // Find majority
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
    
    return intervals;
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
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 animate-pulse">
          <TrendingUp className="w-12 h-12 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Przewidywany stan ruchu</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Następna godzina (na podstawie danych z ostatniego tygodnia)
          </p>
        </div>
      </div>
      
      <div className="space-y-1">
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
        
        {/* Time legend */}
        <div className="flex justify-between text-xs text-muted-foreground pt-1">
          {legendTimes.map((time, index) => (
            <span key={index} className="text-center" style={{ width: '1ch' }}>
              {time}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
