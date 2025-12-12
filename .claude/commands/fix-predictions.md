---
description: Debug and fix traffic prediction issues
---

# Fix Traffic Prediction Issues

Systematic debugging guide for traffic prediction problems.

## Common Issues

### Issue 1: Predictions Not Showing

**Symptoms:**
- Component renders but shows "Brak danych"
- Empty timeline/chart
- No predictions displayed

**Debug Steps:**

1. **Check data fetch:**
```typescript
const { data: reports, error, isLoading } = useQuery({
  queryKey: ['traffic-reports', street, direction],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('traffic_reports')
      .select('*')
      .eq('street', street)
      .eq('direction', direction)
      .gte('reported_at', fourWeeksAgo.toISOString());

    console.log('[Debug] Fetched reports:', data?.length, 'error:', error);
    return data;
  }
});
```

2. **Verify date calculation:**
```typescript
const fourWeeksAgo = new Date();
fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
console.log('[Debug] Fetching from:', fourWeeksAgo.toISOString());
console.log('[Debug] Current time:', new Date().toISOString());
```

3. **Check filtering:**
```typescript
const now = new Date();
const todayDayOfWeek = now.getDay();
console.log('[Debug] Today is day:', todayDayOfWeek); // 0=Sunday, 1=Monday, etc.

const relevantReports = reports?.filter((r) => {
  const reportDate = new Date(r.reported_at);
  const isCorrectDay = reportDate.getDay() === todayDayOfWeek;
  const isCorrectDirection = r.direction === direction;

  console.log('[Debug] Report:', {
    date: reportDate,
    day: reportDate.getDay(),
    direction: r.direction,
    matches: isCorrectDay && isCorrectDirection
  });

  return isCorrectDay && isCorrectDirection;
});

console.log('[Debug] Filtered reports:', relevantReports?.length);
```

**Common Fixes:**
- Ensure 4 weeks of data exists (minimum 28 days)
- Verify `direction` variable is set correctly
- Check database has reports for selected street + direction + day of week

---

### Issue 2: Wrong Predictions Displayed

**Symptoms:**
- Predictions don't match reality
- Showing wrong street/direction data
- Stale data displayed

**Debug Steps:**

1. **Verify useMemo dependencies:**
```typescript
// ✓ Correct - includes all dependencies
const predictions = useMemo(() => {
  return calculatePredictions(reports, street, direction);
}, [reports, street, direction]); // ← Must include direction!

// ✗ Wrong - missing direction
const predictions = useMemo(() => {
  return calculatePredictions(reports, street, direction);
}, [reports, street]); // ← Missing direction causes stale data!
```

2. **Check direction filtering:**
```typescript
// Must filter by direction in the query or memo
const relevantReports = reports?.filter(r => r.direction === direction);
console.log('[Debug] Direction filter:', {
  selected: direction,
  total: reports?.length,
  filtered: relevantReports?.length
});
```

**Common Fixes:**
- Add `direction` to useMemo dependency array
- Ensure direction is passed to child components
- Clear React Query cache if stale: `queryClient.invalidateQueries(['traffic-reports'])`

---

### Issue 3: Majority Vote Not Working

**Symptoms:**
- Incorrect status colors
- Random predictions
- No clear pattern

**Debug Steps:**

1. **Verify majority vote logic:**
```typescript
function getMajorityStatus(reports: Report[]): string {
  if (!reports || reports.length === 0) return 'neutral';

  const counts = reports.reduce((acc, report) => {
    const status = report.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('[Debug] Status counts:', counts);

  const majority = Object.keys(counts).reduce((a, b) =>
    counts[a] > counts[b] ? a : b
  );

  console.log('[Debug] Majority status:', majority);
  return majority;
}
```

2. **Check time interval grouping:**
```typescript
const INTERVAL_MINUTES = 5;

const intervals = useMemo(() => {
  const result = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) { // 12 intervals = 60 minutes
    const intervalStart = new Date(now);
    intervalStart.setMinutes(now.getMinutes() + (i * INTERVAL_MINUTES));

    const intervalEnd = new Date(intervalStart);
    intervalEnd.setMinutes(intervalStart.getMinutes() + INTERVAL_MINUTES);

    const reportsInInterval = relevantReports?.filter(r => {
      const reportTime = new Date(r.reported_at);
      const reportMinutes = reportTime.getHours() * 60 + reportTime.getMinutes();
      const startMinutes = intervalStart.getHours() * 60 + intervalStart.getMinutes();
      const endMinutes = intervalEnd.getHours() * 60 + intervalEnd.getMinutes();

      return reportMinutes >= startMinutes && reportMinutes < endMinutes;
    });

    console.log('[Debug] Interval', i, {
      start: intervalStart,
      end: intervalEnd,
      reportsCount: reportsInInterval?.length
    });

    const status = getMajorityStatus(reportsInInterval || []);
    result.push({ intervalStart, status });
  }

  return result;
}, [relevantReports]);
```

**Common Fixes:**
- Verify time zone handling (use same time zone throughout)
- Ensure interval calculation is consistent
- Check that reports exist for the time window

---

### Issue 4: Performance Issues

**Symptoms:**
- Slow rendering
- Browser freezing
- High CPU usage

**Debug Steps:**

1. **Check data volume:**
```typescript
console.log('[Debug] Total reports:', reports?.length);
console.log('[Debug] Filtered reports:', relevantReports?.length);
```

2. **Optimize filtering:**
```typescript
// ✓ Filter in database query (better)
const { data } = await supabase
  .from('traffic_reports')
  .select('id, status, reported_at, direction') // ← Select only needed columns
  .eq('street', street)
  .eq('direction', direction) // ← Filter in DB
  .gte('reported_at', fourWeeksAgo.toISOString())
  .limit(5000); // ← Limit results

// ✗ Fetch all then filter (worse)
const { data } = await supabase
  .from('traffic_reports')
  .select('*'); // ← Fetches everything!
```

3. **Memoize expensive calculations:**
```typescript
// ✓ Correct - memoized
const predictions = useMemo(() => {
  // Expensive calculation here
  return processData(reports);
}, [reports]);

// ✗ Wrong - recalculates on every render
const predictions = processData(reports);
```

**Common Fixes:**
- Add `.limit()` to queries
- Select only needed columns
- Use useMemo for calculations
- Debounce rapid updates

---

## Prediction Logic Checklist

- [ ] Fetch 4 weeks (28 days) of historical data
- [ ] Filter by same day of week as today
- [ ] Filter by selected direction
- [ ] Include `direction` in useMemo dependencies
- [ ] Group reports into time intervals
- [ ] Use majority vote for each interval
- [ ] Handle empty intervals (show neutral)
- [ ] Optimize queries (select columns, add limits)

## Standard Prediction Pattern

```typescript
export const PredictionComponent = ({ street, direction }: Props) => {
  // 1. Fetch historical data (4 weeks)
  const { data: weeklyReports } = useQuery({
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
    }
  });

  // 2. Filter by day of week
  const predictions = useMemo(() => {
    const now = new Date();
    const todayDayOfWeek = now.getDay();

    const relevantReports = weeklyReports.filter((r) => {
      const reportDate = new Date(r.reported_at);
      return reportDate.getDay() === todayDayOfWeek && r.direction === direction;
    });

    // 3. Group into intervals and use majority vote
    // ... interval logic here ...

    return intervals;
  }, [weeklyReports, direction]); // ← MUST include direction!

  // 4. Render
  return (
    <div>
      {predictions.map((pred, i) => (
        <div key={i} className={`bg-traffic-${pred.status}`}>
          {/* Display prediction */}
        </div>
      ))}
    </div>
  );
};
```

## Time Intervals by Component

| Component | Interval Size | Time Range | Total Intervals |
|-----------|---------------|------------|-----------------|
| PredictedTraffic | 5 minutes | Next 60 min | 12 |
| WeeklyTimeline | 30 minutes | 5:00-22:00 | 34 per day × 7 |
| TodayTimeline | 1 hour | Full 24 hours | 24 |
| GreenWave | 10 minutes | Last 7 days | Varies |

## References

- Architecture: `.claude/architecture.md`
- Use cases: `.claude/use-cases.md`
- Traffic calculations: `src/utils/trafficCalculations.ts`
- Example: `src/components/PredictedTraffic.tsx`

After debugging, provide the user with:
1. Root cause of the issue
2. Specific fix needed
3. Updated code with fixes
4. Testing instructions
