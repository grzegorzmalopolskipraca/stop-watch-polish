import { addDays, subDays } from "date-fns";

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
 * Calculate traffic status for each 30-minute block over the last 7 days
 * Returns data from 5:00 to 22:00 for each day
 */
export const calculateWeeklyTrafficBlocks = (reports: Report[]): DayData[] => {
  const now = new Date();
  // Start from yesterday to get last 7 days
  const yesterday = subDays(now, 1);
  const weekStart = subDays(yesterday, 6);
  
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
      
      const blockStart = new Date(currentDay);
      blockStart.setHours(hour, minute, 0, 0);
      
      const blockEnd = new Date(blockStart);
      blockEnd.setMinutes(blockEnd.getMinutes() + 30);
      
      // Filter reports for this 30-minute block
      const blockReports = reports.filter((r) => {
        const reportTime = new Date(r.reported_at);
        return reportTime >= blockStart && reportTime < blockEnd;
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
 * Filters by direction
 */
export const getStatusForTime = (
  reports: Report[],
  targetHour: number,
  targetMinute: number,
  direction: "to_center" | "from_center"
): { [dayOfWeek: number]: { date: Date; status: string } } => {
  const filteredReports = reports.filter(r => r.direction === direction);
  const weekData = calculateWeeklyTrafficBlocks(filteredReports);
  
  const result: { [dayOfWeek: number]: { date: Date; status: string } } = {};
  
  weekData.forEach((dayData) => {
    const block = dayData.blocks.find(
      b => b.hour === targetHour && b.minute === targetMinute
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
