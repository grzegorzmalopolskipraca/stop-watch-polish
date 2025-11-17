import { addMinutes } from "date-fns";

export interface Report {
  status: string;
  reported_at: string;
  direction: string;
}

export interface PredictionInterval {
  time: Date;
  status: 'stoi' | 'toczy_sie' | 'jedzie';
}

/**
 * Predicts traffic status for 5-minute intervals using the same algorithm as PredictedTraffic component.
 * Uses last 4 weeks of data for the same day of week, with fallback strategies.
 */
export const predictTrafficIntervals = (
  reports: Report[],
  direction: string,
  startTime: Date,
  intervalCount: number
): PredictionInterval[] => {
  const now = new Date();
  const currentMinute = startTime.getMinutes();
  const currentHour = startTime.getHours();

  // Round to nearest 5 minutes
  const roundedMinute = Math.floor(currentMinute / 5) * 5;
  const baseTime = new Date(
    startTime.getFullYear(),
    startTime.getMonth(),
    startTime.getDate(),
    currentHour,
    roundedMinute,
    0
  );

  // Get today's day of week (0 = Sunday, 1 = Monday, etc.)
  const todayDayOfWeek = now.getDay();

  // Check if today is a weekday (Monday = 1, Friday = 5)
  const isWeekday = todayDayOfWeek >= 1 && todayDayOfWeek <= 5;

  // Filter reports to ALL historical data from the same day of week and direction
  const sameDayReports = reports.filter((r) => {
    const reportDate = new Date(r.reported_at);
    return reportDate.getDay() === todayDayOfWeek && r.direction === direction;
  });

  // For weekdays, also prepare reports from all weekdays (Monday-Friday)
  const weekdayReports = isWeekday
    ? reports.filter((r) => {
        const reportDate = new Date(r.reported_at);
        const dayOfWeek = reportDate.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5 && r.direction === direction;
      })
    : [];

  // Helper function to get status from reports
  const getStatusFromReports = (
    reportsToCheck: Report[]
  ): "stoi" | "toczy_sie" | "jedzie" | null => {
    if (reportsToCheck.length === 0) return null;

    const statusCounts = {
      stoi: 0,
      toczy_sie: 0,
      jedzie: 0,
    };

    reportsToCheck.forEach((r) => {
      if (r.status === "stoi") statusCounts.stoi++;
      else if (r.status === "toczy_sie") statusCounts.toczy_sie++;
      else if (r.status === "jedzie") statusCounts.jedzie++;
    });

    // Find status with highest count (majority wins)
    if (
      statusCounts.stoi >= statusCounts.toczy_sie &&
      statusCounts.stoi >= statusCounts.jedzie
    ) {
      return "stoi";
    } else if (
      statusCounts.toczy_sie >= statusCounts.stoi &&
      statusCounts.toczy_sie >= statusCounts.jedzie
    ) {
      return "toczy_sie";
    } else {
      return "jedzie";
    }
  };

  // Create intervals
  const intervals: PredictionInterval[] = [];
  for (let i = 0; i < intervalCount; i++) {
    const intervalStart = addMinutes(baseTime, i * 5);
    const intervalEnd = addMinutes(intervalStart, 5);
    const intervalStartMinutes =
      intervalStart.getHours() * 60 + intervalStart.getMinutes();
    const intervalEndMinutes =
      intervalEnd.getHours() * 60 + intervalEnd.getMinutes();

    // STEP 1: Try 5-minute window with same day-of-week
    let intervalReports = sameDayReports.filter((r) => {
      const reportDate = new Date(r.reported_at);
      const reportMinutes =
        reportDate.getHours() * 60 + reportDate.getMinutes();
      return (
        reportMinutes >= intervalStartMinutes &&
        reportMinutes < intervalEndMinutes
      );
    });

    let status = getStatusFromReports(intervalReports);

    // STEP 2: If no data, try 10-minute window (±5 minutes) with same day-of-week
    if (status === null) {
      const expandedStartMinutes = intervalStartMinutes - 5;
      const expandedEndMinutes = intervalEndMinutes + 5;

      intervalReports = sameDayReports.filter((r) => {
        const reportDate = new Date(r.reported_at);
        const reportMinutes =
          reportDate.getHours() * 60 + reportDate.getMinutes();
        return (
          reportMinutes >= expandedStartMinutes &&
          reportMinutes < expandedEndMinutes
        );
      });

      status = getStatusFromReports(intervalReports);
    }

    // STEP 3: If still no data AND it's a weekday, try 10-minute window with all weekdays
    if (status === null && isWeekday) {
      const expandedStartMinutes = intervalStartMinutes - 5;
      const expandedEndMinutes = intervalEndMinutes + 5;

      intervalReports = weekdayReports.filter((r) => {
        const reportDate = new Date(r.reported_at);
        const reportMinutes =
          reportDate.getHours() * 60 + reportDate.getMinutes();
        return (
          reportMinutes >= expandedStartMinutes &&
          reportMinutes < expandedEndMinutes
        );
      });

      status = getStatusFromReports(intervalReports);
    }

    // STEP 4: If still no data, default to 'jedzie' (optimistic)
    if (status === null) {
      status = "jedzie";
    }

    intervals.push({
      time: intervalStart,
      status,
    });
  }

  return intervals;
};

/**
 * Groups consecutive intervals of the same status into time ranges
 */
export interface TimeRange {
  start: string;
  end: string;
  durationMinutes: number;
  status: "stoi" | "toczy_sie" | "jedzie";
}

export const groupIntervalsIntoRanges = (
  intervals: PredictionInterval[]
): TimeRange[] => {
  if (intervals.length === 0) return [];

  const ranges: TimeRange[] = [];
  let rangeStart = intervals[0].time;
  let currentStatus = intervals[0].status;

  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i].status !== currentStatus) {
      // End current range
      ranges.push({
        start: formatTime(rangeStart),
        end: formatTime(intervals[i].time),
        durationMinutes:
          (intervals[i].time.getTime() - rangeStart.getTime()) / (1000 * 60),
        status: currentStatus,
      });

      // Start new range
      rangeStart = intervals[i].time;
      currentStatus = intervals[i].status;
    }
  }

  // Add final range
  const lastInterval = intervals[intervals.length - 1];
  const endTime = addMinutes(lastInterval.time, 5);
  ranges.push({
    start: formatTime(rangeStart),
    end: formatTime(endTime),
    durationMinutes: (endTime.getTime() - rangeStart.getTime()) / (1000 * 60),
    status: currentStatus,
  });

  return ranges;
};

const formatTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};
