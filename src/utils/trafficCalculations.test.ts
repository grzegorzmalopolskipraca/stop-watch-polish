import { describe, it, expect } from 'vitest';
import { calculateWeeklyTrafficBlocks, getStatusForTimeFromGrid } from './trafficCalculations';
import { addDays, startOfDay } from 'date-fns';

describe('trafficCalculations', () => {
  describe('calculateWeeklyTrafficBlocks', () => {
    it('should return 7 days of data', () => {
      const reports = [
        {
          status: 'stoi',
          reported_at: new Date().toISOString(),
          direction: 'do centrum',
        },
      ];

      const result = calculateWeeklyTrafficBlocks(reports);

      expect(result).toHaveLength(7);
    });

    it('should have 34 blocks per day (5:00-22:00, 30-min intervals)', () => {
      const reports = [];
      const result = calculateWeeklyTrafficBlocks(reports);

      // Each day should have 34 blocks (17 hours * 2 blocks/hour)
      result.forEach((dayData) => {
        expect(dayData.blocks).toHaveLength(34);
      });
    });

    it('should return neutral status when no reports in time block', () => {
      const reports = [];
      const result = calculateWeeklyTrafficBlocks(reports);

      // All blocks should be neutral when there are no reports
      result.forEach((dayData) => {
        dayData.blocks.forEach((block) => {
          expect(block.status).toBe('neutral');
        });
      });
    });

    it('should calculate majority status correctly', () => {
      const now = new Date();
      const baseTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 15, 0);

      const reports = [
        // 3 "stoi" reports at 10:15
        {
          status: 'stoi',
          reported_at: baseTime.toISOString(),
          direction: 'do centrum',
        },
        {
          status: 'stoi',
          reported_at: new Date(baseTime.getTime() + 1000).toISOString(),
          direction: 'do centrum',
        },
        {
          status: 'stoi',
          reported_at: new Date(baseTime.getTime() + 2000).toISOString(),
          direction: 'do centrum',
        },
        // 1 "jedzie" report at 10:15
        {
          status: 'jedzie',
          reported_at: new Date(baseTime.getTime() + 3000).toISOString(),
          direction: 'do centrum',
        },
      ];

      const result = calculateWeeklyTrafficBlocks(reports);

      // Find today's data
      const today = result.find((dayData) => {
        return dayData.day.toDateString() === now.toDateString();
      });

      expect(today).toBeDefined();

      // Find the 10:00-10:30 block
      const block10_00 = today?.blocks.find((b) => b.hour === 10 && b.minute === 0);

      // Majority should be "stoi" (3 vs 1)
      expect(block10_00?.status).toBe('stoi');
    });

    it('should handle database timestamp format with space and timezone', () => {
      const reports = [
        {
          status: 'stoi',
          reported_at: '2025-11-28 04:19:51.686+00',
          direction: 'do centrum',
        },
      ];

      // Should not throw error
      expect(() => calculateWeeklyTrafficBlocks(reports)).not.toThrow();
    });

    it('should handle ISO timestamp format', () => {
      const reports = [
        {
          status: 'jedzie',
          reported_at: '2025-11-28T04:19:51.686Z',
          direction: 'od centrum',
        },
      ];

      // Should not throw error
      expect(() => calculateWeeklyTrafficBlocks(reports)).not.toThrow();
    });

    it('should create blocks starting at 5:00', () => {
      const reports = [];
      const result = calculateWeeklyTrafficBlocks(reports);

      result.forEach((dayData) => {
        const firstBlock = dayData.blocks[0];
        expect(firstBlock.hour).toBe(5);
        expect(firstBlock.minute).toBe(0);
      });
    });

    it('should create blocks ending at 21:30', () => {
      const reports = [];
      const result = calculateWeeklyTrafficBlocks(reports);

      result.forEach((dayData) => {
        const lastBlock = dayData.blocks[dayData.blocks.length - 1];
        expect(lastBlock.hour).toBe(21);
        expect(lastBlock.minute).toBe(30);
      });
    });
  });

  describe('getStatusForTimeFromGrid', () => {
    it('should return status for specific hour and minute', () => {
      const now = new Date();
      const weekStart = startOfDay(addDays(now, -6));

      const weeklyData = [];
      for (let day = 0; day < 7; day++) {
        const currentDay = addDays(weekStart, day);
        weeklyData.push({
          day: currentDay,
          blocks: [
            { hour: 8, minute: 0, status: 'stoi' },
            { hour: 8, minute: 30, status: 'jedzie' },
            { hour: 9, minute: 0, status: 'toczy_sie' },
          ],
        });
      }

      const result = getStatusForTimeFromGrid(weeklyData, 8, 0);

      // Should return status for all 7 days
      expect(Object.keys(result)).toHaveLength(7);

      // Each day should have status "stoi" for 8:00
      Object.values(result).forEach((dayData) => {
        expect(dayData.status).toBe('stoi');
      });
    });

    it('should round down to nearest 30-minute block', () => {
      const now = new Date();
      const weekStart = startOfDay(addDays(now, -6));

      const weeklyData = [];
      for (let day = 0; day < 7; day++) {
        const currentDay = addDays(weekStart, day);
        weeklyData.push({
          day: currentDay,
          blocks: [
            { hour: 10, minute: 0, status: 'stoi' },
            { hour: 10, minute: 30, status: 'jedzie' },
          ],
        });
      }

      // Request 10:15 should round down to 10:00
      const result1 = getStatusForTimeFromGrid(weeklyData, 10, 15);
      Object.values(result1).forEach((dayData) => {
        expect(dayData.status).toBe('stoi');
      });

      // Request 10:45 should round down to 10:30
      const result2 = getStatusForTimeFromGrid(weeklyData, 10, 45);
      Object.values(result2).forEach((dayData) => {
        expect(dayData.status).toBe('jedzie');
      });
    });

    it('should convert day of week correctly (Monday=0, Sunday=6)', () => {
      const now = new Date();
      const weekStart = startOfDay(addDays(now, -6));

      const weeklyData = [];
      for (let day = 0; day < 7; day++) {
        const currentDay = addDays(weekStart, day);
        weeklyData.push({
          day: currentDay,
          blocks: [{ hour: 8, minute: 0, status: 'stoi' }],
        });
      }

      const result = getStatusForTimeFromGrid(weeklyData, 8, 0);

      // Should have entries for Monday (0) through Sunday (6)
      [0, 1, 2, 3, 4, 5, 6].forEach((dayOfWeek) => {
        expect(result[dayOfWeek]).toBeDefined();
      });
    });

    it('should return empty object when no matching blocks', () => {
      const now = new Date();
      const weekStart = startOfDay(addDays(now, -6));

      const weeklyData = [];
      for (let day = 0; day < 7; day++) {
        const currentDay = addDays(weekStart, day);
        weeklyData.push({
          day: currentDay,
          blocks: [{ hour: 8, minute: 0, status: 'stoi' }],
        });
      }

      // Request non-existent time (15:00)
      const result = getStatusForTimeFromGrid(weeklyData, 15, 0);

      // Should have no entries (blocks only go 5:00-22:00)
      expect(Object.keys(result)).toHaveLength(0);
    });
  });
});
