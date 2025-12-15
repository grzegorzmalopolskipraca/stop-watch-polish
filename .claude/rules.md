# Coding Standards & Rules

## Project-Specific Rules

### 1. Language & Localization

**UI Language: Polish**
- All user-facing text MUST be in Polish
- Button labels, notifications, error messages, tooltips
- Route names: `/o-projekcie`, `/regulamin`, `/kontakt`, etc.

**Code & Comments: English or Polish**
- Code comments can be in either language
- Console logs can mix English and Polish
- Documentation preferably in English

**Examples:**
```tsx
// ✓ Correct
<Button>Zgłoś ruch</Button>
const statusLabels = {
  stoi: "Stoi",
  toczy_sie: "Toczy się",
  jedzie: "Jedzie"
};

// ✗ Wrong
<Button>Report Traffic</Button>
```

### 2. TypeScript Configuration

**Relaxed Settings for Rapid Development**
- `noImplicitAny: false` - Allow implicit any
- `strictNullChecks: false` - Allow nullable types
- Allow unused parameters and variables

**When to Use Types:**
- Always type function parameters when not obvious
- Use database types from `@/integrations/supabase/types`
- Let TypeScript infer return types when clear

**Examples:**
```typescript
// ✓ Acceptable
const handleClick = (status) => {
  submitReport(status);
};

// ✓ Better
const handleClick = (status: "stoi" | "toczy_sie" | "jedzie") => {
  submitReport(status);
};
```

### 3. Import Path Aliases

**Always Use @ Alias**
```typescript
// ✓ Correct
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { calculateSpeed } from "@/utils/trafficCalculations";

// ✗ Wrong
import { Button } from "../../components/ui/button";
import { supabase } from "../integrations/supabase/client";
```

### 4. Component Structure

**File Organization:**
```tsx
// 1. Imports
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// 2. Types/Interfaces (if needed)
interface TrafficReportProps {
  street: string;
  direction: string;
}

// 3. Component
export const TrafficReport = ({ street, direction }: TrafficReportProps) => {
  // 3a. Hooks
  const [status, setStatus] = useState("");
  const { data } = useQuery(/* ... */);

  // 3b. Derived state
  const filteredData = useMemo(() => /* ... */, [data]);

  // 3c. Handlers
  const handleSubmit = () => {/* ... */};

  // 3d. Effects
  useEffect(() => {/* ... */}, []);

  // 3e. Return JSX
  return <div>...</div>;
};
```

### 5. Traffic Prediction Logic

**CRITICAL: Data Filtering Pattern**

All traffic prediction components MUST filter data consistently:

```typescript
// 1. Fetch 4 weeks of historical data
const fourWeeksAgo = new Date();
fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

const { data: weeklyReports } = useQuery({
  queryKey: ['traffic-reports', street, direction],
  queryFn: async () => {
    const { data } = await supabase
      .from('traffic_reports')
      .select('*')
      .eq('street', street)
      .eq('direction', direction)
      .gte('reported_at', fourWeeksAgo.toISOString());
    return data;
  }
});

// 2. Filter by same day of week
const now = new Date();
const todayDayOfWeek = now.getDay();

const relevantReports = weeklyReports.filter((r) => {
  const reportDate = new Date(r.reported_at);
  return reportDate.getDay() === todayDayOfWeek && r.direction === direction;
});

// 3. Group into time intervals and use majority vote
// ... see specific component for interval size
```

**Time Interval Standards:**
- PredictedTraffic: 5-minute intervals (next hour)
- WeeklyTimeline: 30-minute blocks (5:00-22:00, last 7 days)
- GreenWave: 10-minute intervals (last 7 days)
- TodayTimeline: 1-hour blocks (full 24-hour day)

**Important:** Always include `direction` in useMemo dependency arrays!

### 6. Speed Data Flow

**Always Propagate Current Speed**

When traffic speed is available, include it in reports:

```typescript
// Use ref for immediate access (avoids stale closure)
const currentSpeedRef = useRef<number | null>(null);

const handleSpeedUpdate = (speed: number) => {
  currentSpeedRef.current = speed;
  setLastKnownSpeed(speed);
};

const submitReport = async (status: string) => {
  const speed = currentSpeedRef.current; // Read from ref, not state

  await supabase.functions.invoke('submit-traffic-report', {
    body: { street, status, direction, speed }
  });
};
```

**Debug Logging:**
- Use `[SpeedFlow]` prefix for speed-related logs
- Backend uses `[SpeedFlow-Backend]` prefix

### 7. State Management Rules

**Server State (React Query)**
```typescript
// ✓ Always use React Query for Supabase queries
const { data, isLoading, error } = useQuery({
  queryKey: ['traffic-reports', street],
  queryFn: async () => {
    const { data } = await supabase
      .from('traffic_reports')
      .select('*')
      .eq('street', street);
    return data;
  }
});

// ✗ Don't use raw fetch or useState for server data
const [data, setData] = useState([]);
useEffect(() => {
  fetch('/api/traffic').then(r => setData(r));
}, []);
```

**Local State (React hooks)**
```typescript
// UI state
const [isOpen, setIsOpen] = useState(false);

// Immediate access (refs)
const currentSpeedRef = useRef<number | null>(null);

// Derived data (memoization)
const filteredData = useMemo(() =>
  data.filter(r => r.status === 'stoi'),
  [data]
);
```

**Persistent State (LocalStorage)**
```typescript
// Read on mount
const [selectedStreet, setSelectedStreet] = useState(
  () => localStorage.getItem('selectedStreet') || 'Borowska'
);

// Save on change
useEffect(() => {
  localStorage.setItem('selectedStreet', selectedStreet);
}, [selectedStreet]);
```

### 8. Styling Rules

**Use Tailwind CSS**
```tsx
// ✓ Tailwind utility classes
<div className="flex items-center gap-2 px-4 py-2">

// ✓ Custom traffic colors
<div className="bg-traffic-stoi text-white">Stoi</div>
<div className="bg-traffic-toczy text-white">Toczy się</div>
<div className="bg-traffic-jedzie text-white">Jedzie</div>

// ✗ Inline styles (avoid unless necessary)
<div style={{ display: 'flex', gap: '8px' }}>
```

**Mobile-First Responsive Design**
```tsx
// ✓ Mobile first, then larger screens
<div className="px-1 gap-2 md:px-4 md:gap-4">

// ✓ Fixed heights for icon alignment
<div className="h-8 flex items-center">

// ✓ Responsive text
<span className="text-sm md:text-base">
```

### 9. Route Configuration

**Route Order Matters**
```tsx
// In App.tsx
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/push" element={<Push />} />
  <Route path="/statystyki" element={<Statystyki />} />
  {/* ... other routes ... */}

  {/* ✓ Catch-all MUST be LAST */}
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

**Polish Route Names**
- `/o-projekcie` - About
- `/regulamin` - Terms
- `/kontakt` - Contact
- `/statystyki` - Statistics
- `/push` - Push notifications
- `/rss` - RSS feed
- `/coupons` - Coupons management
- `/kupon?id=` - Coupon redemption

### 10. OneSignal Integration

**Critical Rules:**

1. **Always Initialize in index.html** (not in React components)
2. **Service Worker Must Exist:** `/public/OneSignalSDKWorker.js`
3. **Tag Format:** `street_<streetname>` (lowercase, no spaces)
4. **Helper Functions:** Use `@/utils/onesignal.ts` for subscribe/unsubscribe

```typescript
// ✓ Subscribe to street
import { subscribeToStreet } from "@/utils/onesignal";
await subscribeToStreet("borowska");

// ✓ Check subscription
import { checkStreetSubscription } from "@/utils/onesignal";
const isSubscribed = await checkStreetSubscription("borowska");

// ✗ Don't manipulate tags directly
await OneSignal.User.addTag("borowska", "true"); // Wrong format!
```

**Known Behaviors:**
- Android Chrome shows as "Linux armv8l" in dashboard - **this is expected**
- Filter by tags in OneSignal dashboard to find subscriptions

### 11. QR Code Scanning

**Use BrowserQRCodeReader (not BrowserMultiFormatReader)**

```typescript
import { BrowserQRCodeReader } from "@zxing/browser";

// ✓ Correct pattern
const isProcessingScanRef = useRef(false);
const activeStreamRef = useRef<MediaStream | null>(null);

useEffect(() => {
  if (!scanning || !videoRef.current) return;

  const initCamera = async () => {
    const reader = new BrowserQRCodeReader();
    await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
      if (result && !isProcessingScanRef.current) {
        isProcessingScanRef.current = true;
        // Process once
      }
    });

    if (videoRef.current?.srcObject) {
      activeStreamRef.current = videoRef.current.srcObject as MediaStream;
    }
  };
  initCamera();
}, [scanning]);

// Cleanup
const stopScanning = () => {
  activeStreamRef.current?.getTracks().forEach(track => track.stop());
  activeStreamRef.current = null;
  if (videoRef.current) videoRef.current.srcObject = null;
  isProcessingScanRef.current = false;
};
```

### 12. Database Queries

**Query Patterns:**

```typescript
// ✓ Always filter by street, direction, and time range
const { data } = await supabase
  .from('traffic_reports')
  .select('*')
  .eq('street', selectedStreet)
  .eq('direction', direction)
  .gte('reported_at', startDate)
  .order('reported_at', { ascending: false });

// ✓ Limit results when possible
.limit(100)

// ✓ Select only needed columns
.select('id, status, reported_at, speed')
```

**Status Values:**
- `"stoi"` - Stopped/heavy traffic (red)
- `"toczy_sie"` - Moving slowly (yellow/orange)
- `"jedzie"` - Flowing normally (green)

**Direction Values:**
- `"do centrum"` - Towards city center
- `"od centrum"` - Away from city center

### 13. Error Handling

**Supabase Errors:**
```typescript
const { data, error } = await supabase
  .from('traffic_reports')
  .insert({ /* ... */ });

if (error) {
  console.error('Failed to submit report:', error);
  toast.error('Nie udało się zgłosić ruchu');
  return;
}

toast.success('Zgłoszenie wysłane!');
```

**React Query Errors:**
```typescript
const { data, isError, error } = useQuery({
  queryKey: ['traffic'],
  queryFn: fetchTraffic,
});

if (isError) {
  return <div>Błąd: {error.message}</div>;
}
```

### 14. Environment Variables

**Required Variables:**
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxx...
```

**Usage:**
```typescript
// ✓ Access via import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// ✗ Never commit .env file
// ✗ Never expose service role key in frontend
```

### 15. Performance Best Practices

**Code Splitting:**
```typescript
// ✓ Lazy load routes
const Statistics = lazy(() => import('@/pages/Statystyki'));
```

**Memoization:**
```typescript
// ✓ Memoize expensive calculations
const predictions = useMemo(() => {
  return calculatePredictions(reports, street, direction);
}, [reports, street, direction]);

// ✓ Memoize callbacks passed to children
const handleClick = useCallback(() => {
  submitReport(status);
}, [status]);
```

**Avoid Unnecessary Re-renders:**
```typescript
// ✓ Use refs for values that don't need re-render
const currentSpeedRef = useRef<number>(0);

// ✗ Don't use state for everything
const [mouseX, setMouseX] = useState(0); // Bad for frequent updates
```

### 16. Git Commit Messages

**Format:**
```
<type>: <description>

Examples:
feat: Add traffic prediction for next hour
fix: Resolve speed data not being submitted
refactor: Simplify traffic calculation logic
docs: Update OneSignal integration guide
style: Improve mobile layout for timeline
test: Add unit tests for speed calculations
chore: Update dependencies
```

**Include Co-Authored-By:**
```
feat: Add new street to monitoring list

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 17. Testing Guidelines

**Unit Tests (Vitest):**
```typescript
// Test utility functions
describe('calculateSpeed', () => {
  it('should calculate speed in km/h', () => {
    const speed = calculateSpeed(1000, 60); // 1km in 60s
    expect(speed).toBe(60); // 60 km/h
  });
});
```

**E2E Tests (Playwright - planned):**
```typescript
test('should submit traffic report', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('select', 'Borowska');
  await page.click('text=Stoi');
  await expect(page.locator('text=Zgłoszenie wysłane')).toBeVisible();
});
```

### 18. File Naming Conventions

**Components:**
```
PascalCase.tsx
Examples: TrafficLine.tsx, StreetChat.tsx, PredictedTraffic.tsx
```

**Utils/Hooks:**
```
camelCase.ts
Examples: onesignal.ts, trafficCalculations.ts, useTrafficData.ts
```

**Pages:**
```
PascalCase.tsx
Examples: Index.tsx, Push.tsx, Statystyki.tsx
```

### 19. Comments & Documentation

**When to Comment:**
```typescript
// ✓ Complex logic that needs explanation
// Calculate average speed using majority vote from 5-minute intervals
const avgSpeed = calculateIntervalSpeed(reports, 5);

// ✓ Why, not what
// Use ref to avoid stale closure in event handler
const speedRef = useRef(0);

// ✗ Obvious code doesn't need comments
// Set the street name
setStreet(name);
```

**JSDoc for Exported Functions:**
```typescript
/**
 * Subscribe user to push notifications for a specific street
 * @param street - Street name in lowercase (e.g., "borowska")
 * @returns Promise that resolves when subscription is complete
 */
export const subscribeToStreet = async (street: string): Promise<void> => {
  // ...
};
```

### 20. Debugging

**Console Logging:**
```typescript
// ✓ Use prefixes for easy filtering
console.log('[SpeedFlow] Speed updated:', speed);
console.log('[OneSignal] Subscription status:', isSubscribed);

// ✓ Use appropriate log levels
console.error('[TrafficReport] Failed to submit:', error);
console.warn('[Prediction] No data available for this time');

// ✗ Don't leave random console.logs in production
console.log('test'); // Remove before commit
```

**OneSignal Debugging:**
1. Check console for `[OneSignal]` logs
2. Verify service worker: DevTools → Application → Service Workers
3. Check tags: Use OneSignal dashboard filter
4. Use `/push` page diagnostic button

## Code Review Checklist

Before committing:
- [ ] All user-facing text is in Polish
- [ ] Using `@/` import aliases
- [ ] Traffic predictions include direction in dependency array
- [ ] Speed data is propagated to reports
- [ ] No console.logs left in code
- [ ] TypeScript errors resolved
- [ ] Mobile-responsive layout tested
- [ ] OneSignal tags follow `street_<name>` format
- [ ] Database queries are optimized (filters, limits)
- [ ] Error handling implemented
- [ ] Environment variables not hardcoded

## References

- Full architecture: `.claude/architecture.md`
- Use cases: `.claude/use-cases.md`
- Project documentation: `10devs/` folder
- AI assistant guide: `CLAUDE.md`
