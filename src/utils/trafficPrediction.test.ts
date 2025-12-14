import { describe, it, expect } from 'vitest';
import { predictTrafficIntervals, groupIntervalsIntoRanges } from './trafficPrediction';

describe('trafficPrediction', () => {
  describe('predictTrafficIntervals', () => {
    it('should return specified number of intervals', () => {
      const reports = [];
      const startTime = new Date();
      const intervalCount = 12;

      const result = predictTrafficIntervals(reports, 'do centrum', startTime, intervalCount);

      expect(result).toHaveLength(intervalCount);
    });

    it('should return intervals with 5-minute spacing', () => {
      const reports = [];
      const startTime = new Date(2025, 0, 1, 10, 0, 0);
      const intervalCount = 3;

      const result = predictTrafficIntervals(reports, 'do centrum', startTime, intervalCount);

      // First interval at 10:00
      expect(result[0].time.getHours()).toBe(10);
      expect(result[0].time.getMinutes()).toBe(0);

      // Second interval at 10:05
      expect(result[1].time.getHours()).toBe(10);
      expect(result[1].time.getMinutes()).toBe(5);

      // Third interval at 10:10
      expect(result[2].time.getHours()).toBe(10);
      expect(result[2].time.getMinutes()).toBe(10);
    });

    it('should round start time to nearest 5 minutes', () => {
      const reports = [];
      // Start at 10:07 (should round to 10:05)
      const startTime = new Date(2025, 0, 1, 10, 7, 0);
      const intervalCount = 2;

      const result = predictTrafficIntervals(reports, 'do centrum', startTime, intervalCount);

      // First interval should be at 10:05 (rounded down from 10:07)
      expect(result[0].time.getHours()).toBe(10);
      expect(result[0].time.getMinutes()).toBe(5);

      // Second interval at 10:10
      expect(result[1].time.getHours()).toBe(10);
      expect(result[1].time.getMinutes()).toBe(10);
    });

    it('should default to "jedzie" when no historical data', () => {
      const reports = [];
      const startTime = new Date();
      const intervalCount = 5;

      const result = predictTrafficIntervals(reports, 'do centrum', startTime, intervalCount);

      // All intervals should be "jedzie" (optimistic default)
      result.forEach((interval) => {
        expect(interval.status).toBe('jedzie');
      });
    });

    it('should filter reports by direction', () => {
      const now = new Date();
      const baseTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);

      const reports = [
        // Reports for "do centrum" - should be used
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
        // Reports for "od centrum" - should be ignored
        {
          status: 'jedzie',
          reported_at: baseTime.toISOString(),
          direction: 'od centrum',
        },
      ];

      const result = predictTrafficIntervals(reports, 'do centrum', baseTime, 1);

      // Should use only "do centrum" reports, resulting in "stoi" (majority)
      expect(result[0].status).toBe('stoi');
    });

    it('should filter reports by day of week', () => {
      // Use current date to ensure day-of-week filtering works
      const now = new Date();
      const todayDayOfWeek = now.getDay();

      // Create a report for today
      const todayReport = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);

      // Create a report for a different day
      const differentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10, 0, 0);

      const reports = [
        // Today's reports - should be used
        {
          status: 'stoi',
          reported_at: todayReport.toISOString(),
          direction: 'do centrum',
        },
        // Different day reports - should be ignored
        {
          status: 'jedzie',
          reported_at: differentDay.toISOString(),
          direction: 'do centrum',
        },
      ];

      // Predict for today
      const result = predictTrafficIntervals(reports, 'do centrum', todayReport, 1);

      // Should only use today's reports (day-of-week match)
      expect(result[0].status).toBe('stoi');
    });

    it('should use majority voting for status', () => {
      const now = new Date();
      const baseTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);

      const reports = [
        // 3 "stoi" reports
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
        // 1 "jedzie" report
        {
          status: 'jedzie',
          reported_at: new Date(baseTime.getTime() + 3000).toISOString(),
          direction: 'do centrum',
        },
      ];

      const result = predictTrafficIntervals(reports, 'do centrum', baseTime, 1);

      // Majority is "stoi" (3 vs 1)
      expect(result[0].status).toBe('stoi');
    });

    it('should return valid status types', () => {
      const reports = [
        {
          status: 'stoi',
          reported_at: new Date().toISOString(),
          direction: 'do centrum',
        },
      ];
      const startTime = new Date();
      const intervalCount = 5;

      const result = predictTrafficIntervals(reports, 'do centrum', startTime, intervalCount);

      result.forEach((interval) => {
        expect(['stoi', 'toczy_sie', 'jedzie']).toContain(interval.status);
      });
    });
  });

  describe('groupIntervalsIntoRanges', () => {
    it('should return empty array when no intervals', () => {
      const result = groupIntervalsIntoRanges([]);
      expect(result).toEqual([]);
    });

    it('should group consecutive same-status intervals', () => {
      const intervals = [
        { time: new Date(2025, 0, 1, 10, 0), status: 'stoi' as const },
        { time: new Date(2025, 0, 1, 10, 5), status: 'stoi' as const },
        { time: new Date(2025, 0, 1, 10, 10), status: 'stoi' as const },
        { time: new Date(2025, 0, 1, 10, 15), status: 'jedzie' as const },
      ];

      const result = groupIntervalsIntoRanges(intervals);

      // Should have 2 ranges: one for "stoi", one for "jedzie"
      expect(result).toHaveLength(2);

      // First range: 10:00 - 10:15 (15 minutes of "stoi")
      expect(result[0].start).toBe('10:00');
      expect(result[0].end).toBe('10:15');
      expect(result[0].durationMinutes).toBe(15);
      expect(result[0].status).toBe('stoi');

      // Second range: 10:15 - 10:20 (5 minutes of "jedzie")
      expect(result[1].start).toBe('10:15');
      expect(result[1].end).toBe('10:20');
      expect(result[1].durationMinutes).toBe(5);
      expect(result[1].status).toBe('jedzie');
    });

    it('should handle single interval', () => {
      const intervals = [
        { time: new Date(2025, 0, 1, 10, 0), status: 'stoi' as const },
      ];

      const result = groupIntervalsIntoRanges(intervals);

      expect(result).toHaveLength(1);
      expect(result[0].start).toBe('10:00');
      expect(result[0].end).toBe('10:05');
      expect(result[0].durationMinutes).toBe(5);
      expect(result[0].status).toBe('stoi');
    });

    it('should format time with leading zeros', () => {
      const intervals = [
        { time: new Date(2025, 0, 1, 8, 5), status: 'jedzie' as const },
      ];

      const result = groupIntervalsIntoRanges(intervals);

      expect(result[0].start).toBe('08:05');
      expect(result[0].end).toBe('08:10');
    });

    it('should create new range when status changes', () => {
      const intervals = [
        { time: new Date(2025, 0, 1, 10, 0), status: 'stoi' as const },
        { time: new Date(2025, 0, 1, 10, 5), status: 'jedzie' as const },
        { time: new Date(2025, 0, 1, 10, 10), status: 'stoi' as const },
      ];

      const result = groupIntervalsIntoRanges(intervals);

      // Should have 3 ranges (status changes twice)
      expect(result).toHaveLength(3);
      expect(result[0].status).toBe('stoi');
      expect(result[1].status).toBe('jedzie');
      expect(result[2].status).toBe('stoi');
    });

    it('should calculate duration correctly for multiple intervals', () => {
      const intervals = [
        { time: new Date(2025, 0, 1, 10, 0), status: 'stoi' as const },
        { time: new Date(2025, 0, 1, 10, 5), status: 'stoi' as const },
        { time: new Date(2025, 0, 1, 10, 10), status: 'stoi' as const },
        { time: new Date(2025, 0, 1, 10, 15), status: 'stoi' as const },
        { time: new Date(2025, 0, 1, 10, 20), status: 'stoi' as const },
      ];

      const result = groupIntervalsIntoRanges(intervals);

      // One range from 10:00 to 10:25 (25 minutes)
      expect(result).toHaveLength(1);
      expect(result[0].durationMinutes).toBe(25);
    });

    it('should handle all three status types', () => {
      const intervals = [
        { time: new Date(2025, 0, 1, 10, 0), status: 'stoi' as const },
        { time: new Date(2025, 0, 1, 10, 5), status: 'toczy_sie' as const },
        { time: new Date(2025, 0, 1, 10, 10), status: 'jedzie' as const },
      ];

      const result = groupIntervalsIntoRanges(intervals);

      expect(result).toHaveLength(3);
      expect(result[0].status).toBe('stoi');
      expect(result[1].status).toBe('toczy_sie');
      expect(result[2].status).toBe('jedzie');
    });
  });
});
