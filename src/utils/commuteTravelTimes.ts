export interface CommuteTravelTimeRecord {
  departure_time: string;
  travel_duration_minutes: number;
  direction: 'to_work' | 'from_work';
  day_of_week: number;
}

export function getBestTravelTimes<T extends CommuteTravelTimeRecord>(
  records: T[],
  direction: CommuteTravelTimeRecord['direction'],
  dayOfWeek: number,
  windowStart: string,
  windowEnd: string,
  limit = 3,
): T[] {
  const start = windowStart.slice(0, 5);
  const end = windowEnd.slice(0, 5);
  if (start > end || limit <= 0) return [];

  const sorted = records
    .filter(record => {
      const departureTime = record.departure_time.slice(0, 5);
      return record.direction === direction
        && record.day_of_week === dayOfWeek
        && departureTime >= start
        && departureTime <= end;
    })
    .sort((a, b) => a.travel_duration_minutes - b.travel_duration_minutes || a.departure_time.localeCompare(b.departure_time));

  const seenDepartureTimes = new Set<string>();
  return sorted.filter(record => {
    const departureTime = record.departure_time.slice(0, 5);
    if (seenDepartureTimes.has(departureTime)) return false;
    seenDepartureTimes.add(departureTime);
    return true;
  }).slice(0, limit);
}
