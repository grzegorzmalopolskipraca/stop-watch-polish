import { useState, useMemo } from "react";
import { format, startOfDay, subDays, isWithinInterval, getDay } from "date-fns";
import { pl } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Report {
  status: string;
  reported_at: string;
  direction: string;
}

interface CommuteOptimizerProps {
  reports: Report[];
}

const COLORS = {
  stoi: "bg-traffic-stoi",
  toczy_sie: "bg-traffic-toczy",
  jedzie: "bg-traffic-jedzie",
  neutral: "bg-muted",
};



// Generate time slots in 30-minute intervals
const generateTimeSlots = (startHour: number, endHour: number) => {
  const slots: string[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      // Don't add slots beyond the end hour
      if (hour === endHour && minute > 0) break;
      slots.push(timeStr);
    }
  }
  return slots;
};

const DEPARTURE_SLOTS = generateTimeSlots(5, 20);
const RETURN_SLOTS = generateTimeSlots(12, 24);

export const CommuteOptimizer = ({ reports }: CommuteOptimizerProps) => {
  const [departureTime, setDepartureTime] = useState<string>("07:00");
  const [returnTime, setReturnTime] = useState<string>("16:00");

  const weeklyCommuteData = useMemo(() => {
    // Parse selected times
    const [depHour, depMin] = departureTime.split(':').map(Number);
    const [retHour, retMin] = returnTime.split(':').map(Number);

    // Get last 7 days (from 7 days ago to today)
    const today = startOfDay(new Date());
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));

    // Helper function to calculate status for a specific day and time window
    const getStatusForDayAndTime = (
      date: Date,
      hour: number,
      minute: number,
      direction: string
    ): string => {
      // Create time window: from hour:minute to hour:minute+30
      const dayStart = startOfDay(date);
      const windowStart = new Date(dayStart);
      windowStart.setHours(hour, minute, 0, 0);
      
      const windowEnd = new Date(windowStart);
      windowEnd.setMinutes(windowEnd.getMinutes() + 30);

      // Filter reports for this specific day, time window, and direction
      const relevantReports = reports.filter((report) => {
        const reportDate = new Date(report.reported_at);
        const reportDayStart = startOfDay(reportDate);
        
        // Check if report is from the same day
        if (reportDayStart.getTime() !== dayStart.getTime()) return false;
        
        // Check if report is in the time window
        if (!isWithinInterval(reportDate, { start: windowStart, end: windowEnd })) return false;
        
        // Check direction
        if (report.direction !== direction) return false;
        
        return true;
      });

      // If no reports, return neutral
      if (relevantReports.length === 0) return "neutral";

      // Count status occurrences
      const statusCounts: { [key: string]: number } = {};
      relevantReports.forEach((report) => {
        statusCounts[report.status] = (statusCounts[report.status] || 0) + 1;
      });

      // Find the majority status
      let maxCount = 0;
      let majorityStatus = "neutral";
      Object.entries(statusCounts).forEach(([status, count]) => {
        if (count > maxCount) {
          maxCount = count;
          majorityStatus = status;
        }
      });

      return majorityStatus;
    };

    // Build week data for all 7 days
    const weekData = last7Days.map((date) => {
      const departureStatus = getStatusForDayAndTime(date, depHour, depMin, "to_center");
      const returnStatus = getStatusForDayAndTime(date, retHour, retMin, "from_center");

      return {
        date,
        departureStatus,
        returnStatus,
      };
    });

    // Sort by day of week: Monday (1) to Sunday (0)
    weekData.sort((a, b) => {
      const dayA = getDay(a.date);
      const dayB = getDay(b.date);
      // Convert Sunday (0) to 7 for sorting
      const sortDayA = dayA === 0 ? 7 : dayA;
      const sortDayB = dayB === 0 ? 7 : dayB;
      return sortDayA - sortDayB;
    });

    return weekData;
  }, [reports, departureTime, returnTime]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-base font-semibold">
          Jeździsz do pracy tylko kilka razy w tygodniu? Resztę pracujesz w domu?
        </h2>
        <p className="text-base text-muted-foreground">
          Wybierz lepsze dni na dojazd do pracy unikając korka
        </p>
      </div>

      <div className="flex items-start gap-2">
        <div className="w-8" />
        <div className="flex-1 flex gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="departure-time" className="text-sm">
              Wyjeżdżam o:
            </Label>
            <Select value={departureTime} onValueChange={setDepartureTime}>
              <SelectTrigger id="departure-time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTURE_SLOTS.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-2">
            <Label htmlFor="return-time" className="text-sm">
              Wracam o:
            </Label>
            <Select value={returnTime} onValueChange={setReturnTime}>
              <SelectTrigger id="return-time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETURN_SLOTS.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {weeklyCommuteData.map(({ date, departureStatus, returnStatus }, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-8 text-xs font-medium text-muted-foreground">
              {format(date, "EEE", { locale: pl })}
            </div>
            <div className="flex-1 flex gap-2">
              <div
                className={`flex-1 h-8 rounded-md transition-colors flex items-center justify-center ${
                  COLORS[departureStatus as keyof typeof COLORS]
                }`}
                title={`${format(date, "dd.MM")} ${departureTime} - ${departureStatus}`}
              >
                <span className="text-xs font-medium opacity-70">Wyjazd</span>
              </div>
              <div
                className={`flex-1 h-8 rounded-md transition-colors flex items-center justify-center ${
                  COLORS[returnStatus as keyof typeof COLORS]
                }`}
                title={`${format(date, "dd.MM")} ${returnTime} - ${returnStatus}`}
              >
                <span className="text-xs font-medium opacity-70">Powrót</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Lewa połowa - dojazd do centrum, prawa połowa - powrót z centrum. Najlepsze dni to takie gdzie z lewej i prawej jest zielono
      </p>
    </div>
  );
};
