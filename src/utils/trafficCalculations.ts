import { addDays, subDays, startOfDay, addMinutes, parseISO } from "date-fns";

interface Report {
  status: string;
  reported_at: string;
  direction: string;
}

export interface DayData {
  day: Date;
  blocks: {
    hour: number;
    minute: number;
    status: string;
  }[];
}

/**
 * Parse timestamp from database format to Date object
 * Handles formats like "2025-11-28 04:19:51.686+00" and ISO strings
 */
const parseReportTime = (timestamp: string): Date => {
  // Replace space with T and ensure proper timezone format for ISO parsing
  const normalized = timestamp
    .replace(' ', 'T')
    .replace(/\+00$/, '+00:00')
    .replace(/\+(\d)$/, '+0$1:00')
    .replace(/\+(\d{2})$/, '+$1:00');
  return parseISO(normalized);
};

/**
 * Calculate traffic status for each 30-minute block over the last 7 days
 * Returns data from 5:00 to 22:00 for each day
 */
export const calculateWeeklyTrafficBlocks = (reports: Report[]): DayData[] => {
  const now = new Date();
  // Start from 6 days ago to get last 7 days including today
  const weekStart = startOfDay(subDays(now, 6));
  
  // Pre-parse all report timestamps for efficiency
  const parsedReports = reports.map(r => ({
    ...r,
    timestamp: parseReportTime(r.reported_at).getTime()
  }));
  
  const grid: DayData[] = [];
  
  for (let day = 0; day < 7; day++) {
    const currentDay = addDays(weekStart, day);
    const blocks: DayData['blocks'] = [];
    
    // 34 blocks per day (from 5:00 to 22:00 = 17 hours * 2)
    const startHour = 5;
    const endHour = 22;
    const totalBlocks = (endHour - startHour) * 2;
    
    for (let block = 0; block < totalBlocks; block++) {
      const hour = startHour + Math.floor(block / 2);
      const minute = (block % 2) * 30;
      
      // Create block start time
      const blockStart = addMinutes(currentDay, hour * 60 + minute);
      const blockEnd = addMinutes(blockStart, 30);
      
      const blockStartTime = blockStart.getTime();
      const blockEndTime = blockEnd.getTime();
      
      // Filter reports for this 30-minute block using timestamp comparison
      const blockReports = parsedReports.filter((r) => {
        return r.timestamp >= blockStartTime && r.timestamp < blockEndTime;
      });
      
      // Calculate majority status
      let status = "neutral";
      if (blockReports.length > 0) {
        const statusCounts = blockReports.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        status = Object.entries(statusCounts).sort(
          ([, a], [, b]) => b - a
        )[0][0];
      }
      
      blocks.push({ hour, minute, status });
    }
    
    grid.push({ day: currentDay, blocks });
  }
  
  return grid;
};

/**
 * Get traffic status for specific hour and minute from weekly data
 * Returns status indexed by day of week (Monday = 0, Sunday = 6)
 */
export const getStatusForTimeFromGrid = (
  weeklyData: DayData[],
  targetHour: number,
  targetMinute: number
): { [dayOfWeek: number]: { date: Date; status: string } } => {
  const result: { [dayOfWeek: number]: { date: Date; status: string } } = {};
  
  // Round down to nearest 30-minute block
  const blockMinute = targetMinute < 30 ? 0 : 30;
  
  weeklyData.forEach((dayData) => {
    const block = dayData.blocks.find(
      b => b.hour === targetHour && b.minute === blockMinute
    );
    
    if (block) {
      // Convert date to day of week (Monday = 0, Sunday = 6)
      const dayOfWeek = dayData.day.getDay() === 0 ? 6 : dayData.day.getDay() - 1;
      result[dayOfWeek] = {
        date: dayData.day,
        status: block.status
      };
    }
  });
  
  return result;
};
