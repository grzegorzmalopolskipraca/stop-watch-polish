import { useState, useMemo } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateWeeklyTrafficBlocks, getStatusForTimeFromGrid } from "@/utils/trafficCalculations";

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

    // Round to 30-minute blocks
    const depBlockMin = depMin < 30 ? 0 : 30;
    const retBlockMin = retMin < 30 ? 0 : 30;

    // Calculate weekly grid using ALL reports (same as WeeklyTimeline - no direction filtering)
    const weeklyGrid = calculateWeeklyTrafficBlocks(reports);

    // Build week data in chronological order (same as WeeklyTimeline)
    const weekData = weeklyGrid.map((dayData) => {
      // Find the matching departure block
      const depBlock = dayData.blocks.find(
        b => b.hour === depHour && b.minute === depBlockMin
      );
      
      // Find the matching return block
      const retBlock = dayData.blocks.find(
        b => b.hour === retHour && b.minute === retBlockMin
      );

      return {
        date: dayData.day,
        departureStatus: depBlock?.status || "neutral",
        returnStatus: retBlock?.status || "neutral",
      };
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
        Lewa połowa - dojazd do centrum, prawa połowa - powrót z centrum
      </p>
    </div>
  );
};
