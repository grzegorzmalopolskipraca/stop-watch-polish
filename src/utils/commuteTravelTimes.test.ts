import { describe, expect, it } from 'vitest';
import { getBestTravelTimes, type CommuteTravelTimeRecord } from './commuteTravelTimes';

const records: CommuteTravelTimeRecord[] = [
  { departure_time: '09:20:00', travel_duration_minutes: 30, direction: 'to_work', day_of_week: 1 },
  { departure_time: '09:00:00', travel_duration_minutes: 40, direction: 'to_work', day_of_week: 1 },
  { departure_time: '08:50:00', travel_duration_minutes: 35, direction: 'to_work', day_of_week: 1 },
  { departure_time: '08:40:00', travel_duration_minutes: 35, direction: 'to_work', day_of_week: 1 },
  { departure_time: '08:40:00', travel_duration_minutes: 38, direction: 'to_work', day_of_week: 1 },
  { departure_time: '08:30:00', travel_duration_minutes: 42, direction: 'to_work', day_of_week: 1 },
  { departure_time: '08:20:00', travel_duration_minutes: 20, direction: 'from_work', day_of_week: 1 },
  { departure_time: '08:10:00', travel_duration_minutes: 25, direction: 'to_work', day_of_week: 2 },
];

describe('getBestTravelTimes', () => {
  it('keeps only departures inside the configured time window, including its boundaries', () => {
    const best = getBestTravelTimes(records, 'to_work', 1, '07:00', '09:00');

    expect(best.map(record => record.departure_time)).toEqual(['08:40:00', '08:50:00', '09:00:00']);
    expect(best.some(record => record.departure_time.startsWith('09:20'))).toBe(false);
  });

  it('returns unique departure times ordered by shortest duration', () => {
    const best = getBestTravelTimes(records, 'to_work', 1, '07:00', '09:00');

    expect(best.map(record => record.travel_duration_minutes)).toEqual([35, 35, 40]);
    expect(best.filter(record => record.departure_time.startsWith('08:40'))).toHaveLength(1);
  });

  it('keeps direction and day results separate and handles an invalid window', () => {
    expect(getBestTravelTimes(records, 'from_work', 1, '07:00', '09:00')).toHaveLength(1);
    expect(getBestTravelTimes(records, 'to_work', 2, '07:00', '09:00')).toHaveLength(1);
    expect(getBestTravelTimes(records, 'to_work', 1, '09:00', '07:00')).toEqual([]);
  });
});
