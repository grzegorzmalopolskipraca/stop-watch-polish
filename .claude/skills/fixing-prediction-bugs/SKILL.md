---
name: fixing-prediction-bugs
description: Diagnoses and fixes common traffic prediction bugs including missing direction dependencies, incorrect day-of-week filtering, stale data, and majority vote issues. Use when predictions show wrong data, don't update, or display inconsistent results.
---

# Fixing Traffic Prediction Bugs

## Most Common Bug: Missing Direction in Dependencies

### Symptom
Predictions don't update when direction changes or show data for wrong direction.

### Diagnosis
```typescript
// Check useMemo dependency array
const predictions = useMemo(() => {
  const filtered = reports?.filter(r => r.direction === direction);
  return processData(filtered);
}, [reports, street]); // ← BUG! Missing direction
```

### Fix
```typescript
const predictions = useMemo(() => {
  const filtered = reports?.filter(r => r.direction === direction);
  return processData(filtered);
}, [reports, street, direction]); // ← Added direction
```

### Verification
```bash
# Search for useMemo without direction
grep -r "useMemo" src/components/ | grep -v "direction\]"
```

## Bug 2: Not Filtering by Day of Week

### Symptom
Predictions inaccurate, include data from all weekdays.

### Fix
```typescript
const relevantReports = weeklyReports?.filter((r) => {
  const reportDate = new Date(r.reported_at);
  const now = new Date();
  return reportDate.getDay() === now.getDay() && r.direction === direction;
});
```

## Bug 3: Using State Instead of Ref for Speed

### Symptom
Speed data not included in reports or shows old speed.

### Fix
```typescript
// Use ref, not state
const currentSpeedRef = useRef<number | null>(null);

const handleSpeedUpdate = (speed: number) => {
  currentSpeedRef.current = speed; // ← Set ref
  setLastKnownSpeed(speed);
};

const submitReport = async () => {
  const speed = currentSpeedRef.current; // ← Read from ref
  // ...
};
```

## Bug 4: Fetching All Columns

### Symptom
Slow query performance.

### Fix
```typescript
// Before
.select('*')

// After
.select('status, reported_at, direction')
```

## Debug Checklist

- [ ] Check useMemo includes `direction`
- [ ] Verify day-of-week filtering: `getDay() === todayDayOfWeek`
- [ ] Check direction filtering in data fetch
- [ ] Verify majority vote logic
- [ ] Check .limit() on query
- [ ] Verify 4-week time range
- [ ] Check React Query cache isn't stale
