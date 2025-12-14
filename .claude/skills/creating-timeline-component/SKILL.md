---
name: creating-timeline-component
description: Creates traffic timeline React components with proper prediction logic, day-of-week filtering, majority voting, and mobile-responsive design. Use when creating new timeline views (hourly, daily, weekly patterns), traffic predictions, or any time-based traffic visualization component.
---

# Creating Traffic Timeline Component

## When to Use This Skill

Use this skill when you need to create a new component that:
- Displays traffic data over time (hourly, daily, weekly)
- Shows traffic predictions based on historical data
- Visualizes traffic patterns in intervals (5min, 30min, 1hr, etc.)
- Implements day-of-week filtering and majority vote logic

## Critical Pattern: Prediction Logic

**ALL timeline components MUST follow this exact pattern:**

```typescript
export const TimelineComponent = ({ street, direction }: Props) => {
  // 1. Fetch 4 weeks of historical data
  const { data: weeklyReports } = useQuery({
    queryKey: ['traffic-reports', street, direction],
    queryFn: async () => {
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const { data } = await supabase
        .from('traffic_reports')
        .select('status, reported_at, direction')  // ← Only needed columns
        .eq('street', street)
        .eq('direction', direction)
        .gte('reported_at', fourWeeksAgo.toISOString())
        .order('reported_at', { ascending: false })
        .limit(5000);

      return data || [];
    }
  });

  // 2. Filter by same day of week + direction
  const timeline = useMemo(() => {
    const now = new Date();
    const todayDayOfWeek = now.getDay(); // 0=Sunday, 6=Saturday

    const relevantReports = weeklyReports?.filter((r) => {
      const reportDate = new Date(r.reported_at);
      return reportDate.getDay() === todayDayOfWeek && r.direction === direction;
    });

    // 3. Group into intervals and use majority vote
    return aggregateByInterval(relevantReports, INTERVAL_MINUTES);
  }, [weeklyReports, direction]); // ← CRITICAL: Must include direction!

  return (/* ... */);
};
```

## Standard Component Template

```typescript
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

interface [ComponentName]Props {
  street: string;
  direction: string;
}

export const [ComponentName] = ({ street, direction }: [ComponentName]Props) => {
  const INTERVAL_MINUTES = [5 | 10 | 30 | 60]; // Choose based on use case

  // Data fetching
  const { data: weeklyReports, isLoading, error } = useQuery({
    queryKey: ['traffic-reports', street, direction],
    queryFn: async () => {
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const { data } = await supabase
        .from('traffic_reports')
        .select('status, reported_at, direction')
        .eq('street', street)
        .eq('direction', direction)
        .gte('reported_at', fourWeeksAgo.toISOString())
        .order('reported_at', { ascending: false })
        .limit(5000);

      return data || [];
    },
    enabled: !!street && !!direction
  });

  // Process data into timeline
  const timeline = useMemo(() => {
    if (!weeklyReports || weeklyReports.length === 0) return [];

    const now = new Date();
    const todayDayOfWeek = now.getDay();

    // Filter by same day of week and direction
    const relevantReports = weeklyReports.filter((r) => {
      const reportDate = new Date(r.reported_at);
      return reportDate.getDay() === todayDayOfWeek && r.direction === direction;
    });

    // Group into time intervals
    const intervals = [];
    for (let i = 0; i < [NUMBER_OF_INTERVALS]; i++) {
      const intervalStart = new Date(now);
      intervalStart.setMinutes(
        Math.floor(now.getMinutes() / INTERVAL_MINUTES) * INTERVAL_MINUTES +
        (i * INTERVAL_MINUTES)
      );

      const intervalEnd = new Date(intervalStart);
      intervalEnd.setMinutes(intervalStart.getMinutes() + INTERVAL_MINUTES);

      // Find reports in this interval
      const reportsInInterval = relevantReports.filter(r => {
        const reportTime = new Date(r.reported_at);
        const reportMinutes = reportTime.getHours() * 60 + reportTime.getMinutes();
        const startMinutes = intervalStart.getHours() * 60 + intervalStart.getMinutes();
        const endMinutes = intervalEnd.getHours() * 60 + intervalEnd.getMinutes();

        return reportMinutes >= startMinutes && reportMinutes < endMinutes;
      });

      // Use majority vote
      const status = getMajorityStatus(reportsInInterval);

      intervals.push({
        time: intervalStart,
        status,
        count: reportsInInterval.length
      });
    }

    return intervals;
  }, [weeklyReports, direction]); // ← MUST include direction!

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-4 border-red-200 bg-red-50">
        <p className="text-red-600">Nie udało się załadować danych</p>
      </Card>
    );
  }

  // Empty state
  if (timeline.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-gray-500">Brak danych dla tego dnia tygodnia</p>
      </Card>
    );
  }

  // Main render
  return (
    <Card className="p-2 md:p-4">
      <h3 className="text-sm md:text-lg font-bold mb-2 md:mb-4">
        [Polish Title]
      </h3>

      <div className="flex gap-1 overflow-x-auto">
        {timeline.map((interval, index) => (
          <div key={index} className="flex-shrink-0">
            <div
              className={`
                w-8 md:w-12 h-12 md:h-16 rounded
                flex items-center justify-center text-xs text-white
                bg-traffic-${interval.status}
              `}
            >
              {/* Display time */}
              {formatTime(interval.time)}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-2 flex gap-2 text-xs flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-traffic-jedzie rounded"></div>
          <span>Jedzie</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-traffic-toczy rounded"></div>
          <span>Toczy się</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-traffic-stoi rounded"></div>
          <span>Stoi</span>
        </div>
      </div>
    </Card>
  );
};

// Helper: Majority vote
function getMajorityStatus(reports: any[]): string {
  if (!reports || reports.length === 0) return 'neutral';

  const counts = reports.reduce((acc, report) => {
    const status = report.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.keys(counts).reduce((a, b) =>
    counts[a] > counts[b] ? a : b
  );
}

// Helper: Format time
function formatTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}
```

## Common Interval Sizes

| Use Case | Interval | Number | Total Time |
|----------|----------|--------|------------|
| Next hour prediction | 5 minutes | 12 | 60 min |
| Optimal departure | 10 minutes | 6 | 60 min |
| Weekly pattern | 30 minutes | 34 | 5:00-22:00 |
| Daily overview | 1 hour | 24 | Full day |

## Mobile-Responsive Patterns

```tsx
// Container
<div className="px-1 gap-1 md:px-4 md:gap-2">

// Text sizing
<span className="text-xs md:text-base">Label</span>

// Block sizing
<div className="w-8 md:w-12 h-12 md:h-16">

// Scrollable timeline
<div className="flex gap-1 overflow-x-auto">
```

## Critical Checklist

Before completing a timeline component, verify:

- [ ] Fetches 4 weeks (28 days) of data
- [ ] Filters by same day of week (`getDay()`)
- [ ] Filters by selected direction
- [ ] **`direction` is in useMemo dependencies** ← CRITICAL!
- [ ] Uses majority vote for each interval
- [ ] Handles empty data (shows "Brak danych")
- [ ] Handles loading state (skeleton)
- [ ] Handles error state (red card)
- [ ] Mobile responsive (responsive classes)
- [ ] Polish language labels
- [ ] Traffic colors: `bg-traffic-{status}`
- [ ] Select only needed columns from DB
- [ ] `.limit(5000)` on query

## Testing

```typescript
// Test day-of-week filtering
const testReports = [
  { reported_at: '2025-01-13T10:00:00Z', status: 'stoi', direction: 'do centrum' }, // Monday
  { reported_at: '2025-01-14T10:00:00Z', status: 'jedzie', direction: 'do centrum' }, // Tuesday
  { reported_at: '2025-01-15T10:00:00Z', status: 'toczy_sie', direction: 'do centrum' }, // Wednesday
];

// If today is Wednesday (day 3), should only include Wednesday report
const now = new Date('2025-01-15T12:00:00Z');
const filtered = testReports.filter(r =>
  new Date(r.reported_at).getDay() === now.getDay()
);

expect(filtered).toHaveLength(1);
expect(filtered[0].status).toBe('toczy_sie');
```

## Common Mistakes to Avoid

❌ **Missing direction in dependencies:**
```typescript
useMemo(() => {
  const filtered = reports?.filter(r => r.direction === direction);
  return filtered;
}, [reports]); // ← BUG! Missing direction
```

✓ **Correct:**
```typescript
useMemo(() => {
  const filtered = reports?.filter(r => r.direction === direction);
  return filtered;
}, [reports, direction]); // ← Includes direction
```

❌ **Not filtering by day of week:**
```typescript
const relevantReports = weeklyReports; // ← Will include all days!
```

✓ **Correct:**
```typescript
const relevantReports = weeklyReports.filter(r =>
  new Date(r.reported_at).getDay() === todayDayOfWeek
);
```

❌ **Selecting all columns:**
```typescript
.select('*') // ← Slow! Gets all columns
```

✓ **Correct:**
```typescript
.select('status, reported_at, direction') // ← Only what's needed
```

## File Location

Place component in:
```
src/components/[ComponentName].tsx
```

Import in parent:
```typescript
import { [ComponentName] } from "@/components/[ComponentName]";
```

## References

- See existing examples: `PredictedTraffic.tsx`, `WeeklyTimeline.tsx`, `TodayTimeline.tsx`
- Traffic calculations: `src/utils/trafficCalculations.ts`
- Architecture: `.claude/architecture.md`
- Coding rules: `.claude/rules.md`
