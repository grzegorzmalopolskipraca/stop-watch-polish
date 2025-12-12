# Common Development Use Cases

This document provides practical examples and patterns for common development tasks in the "Czy ulica stoi?" project.

## Table of Contents

1. [Adding New Features](#1-adding-new-features)
2. [Modifying Traffic Prediction Logic](#2-modifying-traffic-prediction-logic)
3. [Database Operations](#3-database-operations)
4. [OneSignal Push Notifications](#4-onesignal-push-notifications)
5. [UI Component Development](#5-ui-component-development)
6. [Bug Fixing Scenarios](#6-bug-fixing-scenarios)
7. [Performance Optimization](#7-performance-optimization)
8. [Testing Workflows](#8-testing-workflows)
9. [Deployment & CI/CD](#9-deployment--cicd)

---

## 1. Adding New Features

### Use Case 1.1: Add a New Street to Monitoring

**Scenario:** Add "Krzywoustego" street to the application.

**Steps:**

1. **Update the streets array** in `src/pages/Index.tsx`:
```typescript
const STREETS = [
  "Borowska",
  "Buforowa",
  "Grabiszyńska",
  // ... existing streets ...
  "Krzywoustego", // ← Add new street here
  "Zwycięska"
].sort();
```

2. **Test the change:**
```bash
npm run dev
# Open http://localhost:8080
# Verify new street appears in dropdown
```

3. **No database migration needed** - streets are stored as text in `traffic_reports.street`

4. **Verify OneSignal tag creation** works:
- Submit a test report for the new street
- Check that `street_krzywoustego` tag is created

**Estimated Time:** 5 minutes

---

### Use Case 1.2: Create New Traffic Visualization Component

**Scenario:** Add a new component showing average speed by hour of day.

**Steps:**

1. **Create component file** `src/components/HourlySpeedChart.tsx`:
```typescript
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

interface HourlySpeedChartProps {
  street: string;
  direction: string;
}

export const HourlySpeedChart = ({ street, direction }: HourlySpeedChartProps) => {
  // 1. Fetch last 7 days of data
  const { data: reports } = useQuery({
    queryKey: ['hourly-speed', street, direction],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('traffic_reports')
        .select('reported_at, speed')
        .eq('street', street)
        .eq('direction', direction)
        .gte('reported_at', sevenDaysAgo.toISOString())
        .not('speed', 'is', null);

      return data || [];
    }
  });

  // 2. Group by hour and calculate average
  const hourlyData = useMemo(() => {
    const grouped: Record<number, number[]> = {};

    reports?.forEach(report => {
      const hour = new Date(report.reported_at).getHours();
      if (!grouped[hour]) grouped[hour] = [];
      grouped[hour].push(report.speed);
    });

    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      avgSpeed: grouped[hour]
        ? grouped[hour].reduce((a, b) => a + b, 0) / grouped[hour].length
        : null
    }));
  }, [reports]);

  // 3. Render chart
  return (
    <Card className="p-4">
      <h3 className="text-lg font-bold mb-4">Średnia prędkość według godziny</h3>
      <div className="grid grid-cols-24 gap-1">
        {hourlyData.map(({ hour, avgSpeed }) => (
          <div
            key={hour}
            className="flex flex-col items-center text-xs"
          >
            <div
              className="w-full bg-blue-500"
              style={{ height: `${avgSpeed ? avgSpeed * 2 : 0}px` }}
            />
            <span>{hour}h</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
```

2. **Add to Index.tsx:**
```typescript
import { HourlySpeedChart } from "@/components/HourlySpeedChart";

// In the component JSX:
<HourlySpeedChart street={selectedStreet} direction={direction} />
```

3. **Test:**
```bash
npm run dev
```

**Estimated Time:** 30-45 minutes

---

### Use Case 1.3: Add New Route/Page

**Scenario:** Create `/historia` page showing user's report history.

**Steps:**

1. **Create page component** `src/pages/Historia.tsx`:
```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Historia = () => {
  const userFingerprint = localStorage.getItem('userFingerprint');

  const { data: reports } = useQuery({
    queryKey: ['user-reports', userFingerprint],
    queryFn: async () => {
      const { data } = await supabase
        .from('traffic_reports')
        .select('*')
        .eq('user_fingerprint', userFingerprint)
        .order('reported_at', { ascending: false })
        .limit(50);
      return data;
    },
    enabled: !!userFingerprint
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Twoja historia zgłoszeń</h1>
      {/* Render reports */}
    </div>
  );
};

export default Historia;
```

2. **Add route to App.tsx:**
```typescript
import Historia from "@/pages/Historia";

// In Routes:
<Route path="/historia" element={<Historia />} />
```

3. **Add navigation link** (if needed):
```typescript
<a href="/historia">Historia</a>
```

4. **Test:**
```bash
npm run dev
# Navigate to http://localhost:8080/historia
```

**Estimated Time:** 20-30 minutes

---

## 2. Modifying Traffic Prediction Logic

### Use Case 2.1: Change Prediction Time Interval

**Scenario:** Change PredictedTraffic from 5-minute to 10-minute intervals.

**Steps:**

1. **Modify `src/components/PredictedTraffic.tsx`:**

```typescript
// Change this:
const INTERVAL_MINUTES = 5;
const INTERVALS_TO_SHOW = 12; // 5min * 12 = 60min

// To this:
const INTERVAL_MINUTES = 10;
const INTERVALS_TO_SHOW = 6; // 10min * 6 = 60min
```

2. **Verify the change:**
```bash
npm run dev
# Check that predictions show 10-minute intervals
```

**Estimated Time:** 5 minutes

---

### Use Case 2.2: Add Weather-Based Predictions

**Scenario:** Fetch weather data and show traffic predictions considering weather conditions.

**Steps:**

1. **Create Edge Function** `supabase/functions/get-weather-forecast/index.ts`:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { lat, lon } = await req.json();

  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${Deno.env.get('OPENWEATHER_API_KEY')}`
  );

  const weather = await response.json();
  return new Response(JSON.stringify(weather), {
    headers: { "Content-Type": "application/json" }
  });
});
```

2. **Call from component:**
```typescript
const { data: weather } = useQuery({
  queryKey: ['weather', 'wroclaw'],
  queryFn: async () => {
    const { data } = await supabase.functions.invoke('get-weather-forecast', {
      body: { lat: 51.1079, lon: 17.0385 }
    });
    return data;
  }
});
```

3. **Adjust predictions based on weather:**
```typescript
const adjustedPrediction = useMemo(() => {
  if (weather?.rain) {
    // Assume 20% slower in rain
    return basePrediction * 0.8;
  }
  return basePrediction;
}, [basePrediction, weather]);
```

**Estimated Time:** 2-3 hours

---

## 3. Database Operations

### Use Case 3.1: Add New Column to Table

**Scenario:** Add `confidence_score` column to `traffic_reports`.

**Steps:**

1. **Create migration:**
```bash
npx supabase migration new add_confidence_score
```

2. **Edit migration file** `supabase/migrations/<timestamp>_add_confidence_score.sql`:
```sql
ALTER TABLE traffic_reports
ADD COLUMN confidence_score NUMERIC;

COMMENT ON COLUMN traffic_reports.confidence_score IS 'Confidence score (0-100) for traffic report accuracy';
```

3. **Apply migration:**
```bash
npx supabase db push
```

4. **Update TypeScript types:**
```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

5. **Use in code:**
```typescript
await supabase
  .from('traffic_reports')
  .insert({
    street,
    status,
    direction,
    speed,
    confidence_score: 85 // ← New field
  });
```

**Estimated Time:** 15-20 minutes

---

### Use Case 3.2: Query Optimization

**Scenario:** Speed up slow query for weekly timeline.

**Steps:**

1. **Identify slow query:**
```typescript
// Slow - fetches all columns, no index
const { data } = await supabase
  .from('traffic_reports')
  .select('*')
  .gte('reported_at', weekAgo);
```

2. **Optimize:**
```typescript
// Fast - select only needed columns, use indexes
const { data } = await supabase
  .from('traffic_reports')
  .select('reported_at, status, street, direction')
  .eq('street', selectedStreet)      // ← Uses index
  .eq('direction', direction)        // ← Uses index
  .gte('reported_at', weekAgo)       // ← Uses index
  .order('reported_at', { ascending: false })
  .limit(1000);                      // ← Limit results
```

3. **Create index if needed:**
```sql
CREATE INDEX idx_traffic_reports_lookup
ON traffic_reports (street, direction, reported_at DESC);
```

**Estimated Time:** 10-15 minutes

---

## 4. OneSignal Push Notifications

### Use Case 4.1: Debug Missing Notifications

**Scenario:** User reports not receiving notifications for a street.

**Steps:**

1. **Check subscription status:**
```typescript
import { checkStreetSubscription } from "@/utils/onesignal";

const isSubscribed = await checkStreetSubscription("borowska");
console.log('[Debug] Subscription status:', isSubscribed);
```

2. **Verify tags in dashboard:**
- Go to OneSignal Dashboard → Audience → Segments
- Filter by tag: `street_borowska`
- Check if user appears

3. **Check service worker:**
```javascript
// In browser console:
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});
```

4. **Use diagnostic tool:**
- Navigate to `/push` page
- Click "Sprawdź pełny status"
- Auto-fix will add missing tags

5. **Test notification manually:**
```bash
# In OneSignal dashboard
Send test notification → Filter by tag: street_borowska
```

**Estimated Time:** 10-15 minutes

---

### Use Case 4.2: Add Custom Notification Action

**Scenario:** Add "View on map" button to push notifications.

**Steps:**

1. **Modify Edge Function** `supabase/functions/send-push-notifications/index.ts`:
```typescript
const notification = {
  contents: { pl: `Ruch na ${street}: ${statusText}` },
  headings: { pl: "Czy ulica stoi?" },
  // Add action buttons
  buttons: [
    {
      id: "view-map",
      text: "Zobacz na mapie",
      icon: "ic_map"
    },
    {
      id: "dismiss",
      text: "Zamknij"
    }
  ],
  // Handle button clicks
  web_url: `https://your-domain.com/?street=${street}#mapa`,
  include_player_ids: playerIds
};
```

2. **Handle button click in index.html:**
```javascript
OneSignalDeferred.push(function(OneSignal) {
  OneSignal.Notifications.addEventListener('click', (event) => {
    console.log('[OneSignal] Notification clicked:', event);

    if (event.action === 'view-map') {
      window.location.href = `/?street=${event.data.street}#mapa`;
    }
  });
});
```

**Estimated Time:** 30-45 minutes

---

## 5. UI Component Development

### Use Case 5.1: Make Component Mobile-Responsive

**Scenario:** Fix timeline component that doesn't work well on mobile.

**Steps:**

1. **Identify issues:**
- Text too small
- Horizontal scroll not smooth
- Icons misaligned

2. **Apply mobile-first approach:**
```tsx
// Before:
<div className="flex gap-4 px-4">
  <span className="text-base">08:00</span>
</div>

// After:
<div className="flex gap-2 px-1 md:gap-4 md:px-4">
  <span className="text-xs md:text-base">08:00</span>
</div>
```

3. **Fix icon alignment:**
```tsx
// Before:
<div className="py-2 justify-center">
  <Icon />
  <span>Label</span>
</div>

// After:
<div className="pt-2 pb-1">
  <Icon className="flex-shrink-0" />
  <span className="h-8 flex items-center">Label</span>
</div>
```

4. **Test on mobile:**
```bash
npm run dev
# Open Chrome DevTools → Toggle device toolbar
# Test on various screen sizes
```

**Estimated Time:** 15-30 minutes

---

### Use Case 5.2: Add Loading States

**Scenario:** Show skeleton loaders while data is loading.

**Steps:**

1. **Install skeleton component** (if not already available):
```tsx
// src/components/ui/skeleton.tsx
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);
```

2. **Use in component:**
```tsx
import { Skeleton } from "@/components/ui/skeleton";

const { data, isLoading } = useQuery({/*...*/});

if (isLoading) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-3/4" />
    </div>
  );
}
```

**Estimated Time:** 10 minutes

---

## 6. Bug Fixing Scenarios

### Use Case 6.1: Fix Speed Data Not Being Submitted

**Scenario:** Traffic reports are submitted without speed data.

**Diagnosis:**
- Check browser console for `[SpeedFlow]` logs
- Verify `currentSpeedRef.current` is set before submission

**Fix:**

1. **Ensure ref is updated:**
```typescript
const handleSpeedUpdate = (speed: number) => {
  console.log('[SpeedFlow] 1. Speed update received:', speed);
  currentSpeedRef.current = speed; // ← Must set ref
  setLastKnownSpeed(speed);
  console.log('[SpeedFlow] 2. Ref updated:', currentSpeedRef.current);
};
```

2. **Read from ref in submit:**
```typescript
const submitReport = async (status: string) => {
  const speed = currentSpeedRef.current; // ← Read from ref, not state
  console.log('[SpeedFlow] 5. Submitting with speed:', speed);

  await supabase.functions.invoke('submit-traffic-report', {
    body: { street, status, direction, speed }
  });
};
```

3. **Verify backend receives it:**
```typescript
// In supabase/functions/submit-traffic-report/index.ts
console.log('[SpeedFlow-Backend] Received speed:', speed);
```

**Estimated Time:** 15-20 minutes

---

### Use Case 6.2: Fix OneSignal Subscription Not Persisting

**Scenario:** User subscribes but loses subscription after refresh.

**Diagnosis:**
- Service worker not registered
- Tags not being saved

**Fix:**

1. **Verify service worker:**
```javascript
// Check if OneSignalSDKWorker.js exists
ls public/OneSignalSDKWorker.js
```

2. **Ensure tags are added after subscription:**
```typescript
const subscribeToStreet = async (street: string) => {
  // 1. Subscribe first
  await OneSignal.Notifications.requestPermission();

  // 2. Wait for subscription to complete
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 3. Add tags
  await OneSignal.User.addTag(`street_${street.toLowerCase()}`, "true");
  await OneSignal.User.addTag("test_device", "true");

  console.log('[OneSignal] Tags added for:', street);
};
```

3. **Verify persistence:**
```typescript
// Check tags on page load
OneSignalDeferred.push(async function(OneSignal) {
  const tags = await OneSignal.User.getTags();
  console.log('[OneSignal] Current tags:', tags);
});
```

**Estimated Time:** 20-30 minutes

---

## 7. Performance Optimization

### Use Case 7.1: Reduce Bundle Size

**Scenario:** Application loads slowly due to large bundle.

**Steps:**

1. **Analyze bundle:**
```bash
npm run build
# Check dist/ folder size
```

2. **Lazy load routes:**
```typescript
// In App.tsx
import { lazy, Suspense } from "react";

const Statistics = lazy(() => import("@/pages/Statystyki"));
const Push = lazy(() => import("@/pages/Push"));

// In Routes:
<Route
  path="/statystyki"
  element={
    <Suspense fallback={<div>Ładowanie...</div>}>
      <Statistics />
    </Suspense>
  }
/>
```

3. **Tree-shake unused Radix components:**
```typescript
// Before:
import * as Dialog from "@radix-ui/react-dialog";

// After (import only what's needed):
import { Root, Trigger, Content } from "@radix-ui/react-dialog";
```

4. **Verify improvement:**
```bash
npm run build
# Compare new dist/ size
```

**Estimated Time:** 30-45 minutes

---

### Use Case 7.2: Optimize React Query Cache

**Scenario:** Too many unnecessary refetches.

**Steps:**

1. **Configure global defaults:**
```typescript
// In main.tsx or App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

2. **Use appropriate staleTime per query:**
```typescript
// Static data - long staleTime
const { data: streets } = useQuery({
  queryKey: ['streets'],
  queryFn: fetchStreets,
  staleTime: Infinity, // Never refetch
});

// Real-time data - short staleTime
const { data: traffic } = useQuery({
  queryKey: ['traffic', street],
  queryFn: () => fetchTraffic(street),
  staleTime: 30 * 1000, // 30 seconds
});
```

**Estimated Time:** 15-20 minutes

---

## 8. Testing Workflows

### Use Case 8.1: Write Unit Test for Utility Function

**Scenario:** Test `calculateSpeed` function.

**Steps:**

1. **Create test file** `src/utils/__tests__/trafficCalculations.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateSpeed } from '../trafficCalculations';

describe('calculateSpeed', () => {
  it('should calculate speed in km/h correctly', () => {
    // 1 km in 60 seconds = 60 km/h
    expect(calculateSpeed(1000, 60)).toBe(60);
  });

  it('should handle zero duration', () => {
    expect(calculateSpeed(1000, 0)).toBe(Infinity);
  });

  it('should return 0 for zero distance', () => {
    expect(calculateSpeed(0, 60)).toBe(0);
  });
});
```

2. **Run tests:**
```bash
npm run test
```

**Estimated Time:** 15 minutes

---

### Use Case 8.2: Record E2E Test with Test Planner

**Scenario:** Create test plan for traffic reporting flow.

**Steps:**

1. **Record user journey:**
```bash
# Start screen recording (Mac)
# Press Cmd+Shift+5 → Record
# Perform actions:
# 1. Open app
# 2. Select street "Borowska"
# 3. Click "Stoi" button
# 4. Verify success toast
# Stop recording → Save as traffic-report-stoi.mov
```

2. **Generate test plan:**
```bash
npx @10xdevspl/test-planner \
  --video=traffic-report-stoi.mov \
  --outDir=./e2e/traffic-reporting
```

3. **Review generated files:**
- `e2e/traffic-reporting/test-plan.md`
- `e2e/traffic-reporting/project-checklist.md`
- `e2e/traffic-reporting/agent-rules.md`

4. **Generate Playwright tests** (use Claude Code with agent-rules.md)

5. **Run tests:**
```bash
npx playwright test
```

**Estimated Time:** 30-45 minutes (first time), 10-15 minutes (subsequent)

---

## 9. Deployment & CI/CD

### Use Case 9.1: Fix Failing GitHub Actions Build

**Scenario:** CI build fails with TypeScript errors.

**Steps:**

1. **Check workflow logs:**
```
Go to GitHub → Actions → Failed workflow → View logs
```

2. **Reproduce locally:**
```bash
npm run type-check
```

3. **Fix errors:**
```typescript
// Add missing types
const handleClick = (event: React.MouseEvent) => {/*...*/};

// Fix nullable access
const name = user?.name || 'Unknown';
```

4. **Verify fix:**
```bash
npm run type-check
npm run build
```

5. **Commit and push:**
```bash
git add .
git commit -m "fix: Resolve TypeScript errors in CI"
git push
```

**Estimated Time:** 15-30 minutes

---

### Use Case 9.2: Add Environment Variables to GitHub Secrets

**Scenario:** Configure Supabase credentials for CI build.

**Steps:**

1. **Get credentials:**
- Go to Supabase Dashboard → Project Settings → API
- Copy `URL` and `anon public` key

2. **Add to GitHub Secrets:**
- Go to GitHub repo → Settings → Secrets and variables → Actions
- Click "New repository secret"
- Add `VITE_SUPABASE_URL` with URL value
- Add `VITE_SUPABASE_PUBLISHABLE_KEY` with anon key

3. **Verify workflow uses them:**
```yaml
# In .github/workflows/ci.yml
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
```

4. **Trigger build:**
```bash
git commit --allow-empty -m "chore: Trigger CI build"
git push
```

**Estimated Time:** 5-10 minutes

---

## Quick Reference

### Common Commands
```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run preview          # Preview production build

# Code Quality
npm run lint             # ESLint
npm run type-check       # TypeScript validation

# Testing
npm run test             # Run tests (watch mode)
npm run test:ci          # Run tests (CI mode)

# Supabase
npx supabase start       # Start local Supabase
npx supabase db push     # Apply migrations
npx supabase gen types   # Generate TypeScript types
```

### File Locations
- Routes: `src/App.tsx`
- Pages: `src/pages/`
- Components: `src/components/`
- Utils: `src/utils/`
- Database types: `src/integrations/supabase/types.ts`
- Edge Functions: `supabase/functions/`
- Migrations: `supabase/migrations/`

### Debugging Tools
- React DevTools: Browser extension
- React Query DevTools: `import { ReactQueryDevtools } from '@tanstack/react-query-devtools'`
- Supabase Studio: `http://localhost:54323` (local)
- OneSignal Dashboard: Check subscription status, send test notifications

---

## Need More Help?

- **Architecture:** `.claude/architecture.md`
- **Coding Rules:** `.claude/rules.md`
- **Full Documentation:** `10devs/` folder
- **AI Assistant Guide:** `CLAUDE.md`
