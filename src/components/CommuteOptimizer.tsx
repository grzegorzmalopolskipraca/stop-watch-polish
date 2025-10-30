import { useState, useMemo } from "react";
import { format, subDays, startOfDay, startOfWeek, addDays } from "date-fns";
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

const DAY_NAMES = ["Pon", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

// Generate time slots in 20-minute intervals
const generateTimeSlots = (startHour: number, endHour: number) => {
  const slots: string[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 20) {
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

  const calculateStatus = (reportsInWindow: Report[]): string => {
    if (reportsInWindow.length === 0) return "neutral";

    const statusCounts = reportsInWindow.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const majorityStatus = Object.entries(statusCounts).sort(
      ([, a], [, b]) => b - a
    )[0][0];

    return majorityStatus;
  };

  const weeklyCommuteData = useMemo(() => {
    const yesterday = subDays(startOfDay(new Date()), 1);
    
    // Parse selected times
    const [depHour, depMin] = departureTime.split(':').map(Number);
    const [retHour, retMin] = returnTime.split(':').map(Number);

    // Collect data for each day of the week, keeping only the most recent occurrence
    const dayOfWeekData = new Map<number, {
      date: Date;
      departureStatus: string;
      returnStatus: string;
    }>();

    // Go through last 7 days from yesterday
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = subDays(yesterday, dayOffset);
      const dayOfWeek = targetDate.getDay() === 0 ? 6 : targetDate.getDay() - 1; // Mon=0, Sun=6

      // Skip if we already have a more recent date for this day of week
      if (dayOfWeekData.has(dayOfWeek)) continue;

      // Calculate status for departure time (to city)
      const departureReports = reports.filter((r) => {
        const reportDate = new Date(r.reported_at);
        return (
          r.direction === "to_center" &&
          reportDate.getFullYear() === targetDate.getFullYear() &&
          reportDate.getMonth() === targetDate.getMonth() &&
          reportDate.getDate() === targetDate.getDate() &&
          reportDate.getHours() === depHour &&
          Math.abs(reportDate.getMinutes() - depMin) < 30
        );
      });

      const departureStatus = calculateStatus(departureReports);

      // Calculate status for return time (from city)
      const returnReports = reports.filter((r) => {
        const reportDate = new Date(r.reported_at);
        return (
          r.direction === "from_center" &&
          reportDate.getFullYear() === targetDate.getFullYear() &&
          reportDate.getMonth() === targetDate.getMonth() &&
          reportDate.getDate() === targetDate.getDate() &&
          reportDate.getHours() === retHour &&
          Math.abs(reportDate.getMinutes() - retMin) < 30
        );
      });

      const returnStatus = calculateStatus(returnReports);

      dayOfWeekData.set(dayOfWeek, {
        date: targetDate,
        departureStatus,
        returnStatus,
      });
    }

    // Convert to array sorted Monday to Sunday
    const weekData = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayData = dayOfWeekData.get(dayIndex);
      if (dayData) {
        weekData.push({
          day: DAY_NAMES[dayIndex],
          date: dayData.date,
          departureStatus: dayData.departureStatus,
          returnStatus: dayData.returnStatus,
        });
      }
    }

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
        {weeklyCommuteData.map(({ day, date, departureStatus, returnStatus }) => (
          <div key={day} className="flex items-center gap-2">
            <div className="w-8 text-xs font-medium text-muted-foreground">
              {day}
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
        Lewa połowa - dojazd do centrum, prawa połowa - powrót z centrum
      </p>
    </div>
  );
};
