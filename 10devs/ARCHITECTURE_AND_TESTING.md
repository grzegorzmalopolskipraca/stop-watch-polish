# Architecture & Testing Strategy

## Project Architecture

### Overview
"Czy ulica stoi?" is a real-time traffic monitoring web application for Wrocław, Poland. It follows a **modern JAMstack architecture** with a React frontend and serverless backend.

---

## 1. Frontend Architecture

### Technology Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite (fast development server, optimized builds)
- **UI Library**: shadcn-ui (Radix UI primitives + Tailwind CSS)
- **State Management**:
  - `@tanstack/react-query` - Server state and data fetching
  - `useState/useEffect` - Local component state
  - `localStorage` - Client-side persistence
- **Routing**: react-router-dom v6

### Architectural Patterns

#### 1.1 Component Architecture
```
src/
├── components/          # Feature components (reusable)
│   ├── ui/             # shadcn-ui primitives (Button, Card, Dialog, etc.)
│   ├── TrafficLine.tsx        # Traffic visualization with Google Routes API
│   ├── PredictedTraffic.tsx   # ML-based traffic predictions
│   ├── WeeklyTimeline.tsx     # Historical patterns (30-min blocks)
│   ├── TodayTimeline.tsx      # Today's traffic (1-hour blocks)
│   ├── GreenWave.tsx          # Optimal departure time calculator
│   ├── WeatherForecast.tsx    # Weather integration
│   ├── StreetChat.tsx         # Real-time chat per street
│   └── ...
│
├── pages/              # Route-specific page components
│   ├── Index.tsx              # Main page (street selection, reporting)
│   ├── Push.tsx               # Push notification management
│   ├── Statystyki.tsx         # Traffic statistics & analytics
│   ├── Coupons.tsx            # Coupon management (admin)
│   ├── Kupon.tsx              # Coupon redemption with QR scanning
│   ├── Konto.tsx              # User account management
│   ├── Auth.tsx               # Authentication
│   └── ...
│
├── utils/              # Pure utility functions
│   ├── trafficCalculations.ts # Traffic data processing algorithms
│   ├── trafficPrediction.ts   # Prediction logic
│   └── onesignal.ts           # OneSignal helpers
│
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
│   └── supabase/              # Supabase client & types
└── App.tsx             # Main app with routing configuration
```

#### 1.2 Data Flow Pattern
**Unidirectional data flow** with React Query for server state:

```
User Interaction
    ↓
React Component (UI)
    ↓
Event Handler / Hook
    ↓
API Call (React Query mutation/query)
    ↓
Supabase Edge Function
    ↓
PostgreSQL Database
    ↓
React Query Cache Update
    ↓
Component Re-render (automatic)
```

**Example Flow - Traffic Report Submission:**
1. User clicks "Stoi" button in `Index.tsx`
2. `submitReport()` function called
3. Sends POST to `/submit-traffic-report` Edge Function
4. Edge Function validates, inserts to `traffic_reports` table
5. React Query invalidates cache for traffic queries
6. UI automatically re-fetches and updates

#### 1.3 State Management Layers

| Layer | Technology | Use Case | Example |
|-------|-----------|----------|---------|
| **Server State** | React Query | API data, caching, background refetching | Traffic reports, user data |
| **URL State** | React Router | Navigation, shareable state | Current page, query params |
| **Local State** | useState | Component-specific UI state | Form inputs, modals, toggles |
| **Client State** | localStorage | Persistent preferences | Selected street, subscription status |
| **Global Context** | React Context (minimal) | Rarely used, prefer React Query | Theme (via next-themes) |

---

## 2. Backend Architecture

### Technology Stack
- **Platform**: Supabase
- **Database**: PostgreSQL
- **Serverless Functions**: Supabase Edge Functions (Deno runtime)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (for coupon images)

### Database Schema

#### Key Tables

**traffic_reports** (Primary table)
- Stores all traffic status submissions
- Partitioned by time for performance
- Columns: `id`, `street`, `status`, `direction`, `speed`, `reported_at`, `user_fingerprint`

**coupons**
- Discount coupons linked to locations
- Status lifecycle: `active` → `redeemed` → `used` → `expired`
- Columns: `id`, `local_id`, `local_name`, `discount`, `status`, `time_from`, `time_to`, `image_link`

**locations**
- Business locations for coupons
- Columns: `id`, `name`, `street`

**Other tables**: `chat_messages`, `incident_reports`, `street_votes`, `carpooling_votes`, etc.

### Edge Functions Architecture

**Pattern**: Each function is a standalone Deno module with CORS support

```
supabase/functions/
├── submit-traffic-report/     # Core: submit new traffic report
├── auto-submit-traffic-report # Auto-submit based on speed
├── auto-traffic-monitor        # Background monitoring job
├── get-traffic-data/           # Fetch Google Routes API data
├── get-traffic-data-batch/     # Batch fetch for multiple streets
├── get-weather-forecast/       # Weather API integration
├── send-push-notifications/    # OneSignal notification sender
├── submit-chat-message/        # Chat message with rate limiting
├── submit-incident-report/     # Report incidents
├── submit-street-vote/         # Voting system
├── fetch-rss-feed/             # RSS feed aggregation
└── ...
```

**Common Pattern:**
```typescript
// Each Edge Function follows this structure:
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from '@supabase/supabase-js'

serve(async (req) => {
  // 1. CORS handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 2. Input validation
  const { street, status, direction } = await req.json()

  // 3. Business logic
  const supabase = createClient(...)
  const result = await supabase.from('traffic_reports').insert({...})

  // 4. Response
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
```

---

## 3. External Integrations

### 3.1 OneSignal (Push Notifications)
- **SDK**: OneSignal Web SDK v16
- **Initialization**: In `index.html` (lines 40-168)
- **Service Worker**: `/public/OneSignalSDKWorker.js`
- **Tag-based subscriptions**: `street_<streetname>` format
- **Foreground notifications**: Custom handler for in-app notifications

**Architecture**:
```
User subscribes in UI
    ↓
OneSignal SDK (client-side)
    ↓
Tag added: "street_borowska"
    ↓
Traffic report submitted
    ↓
Edge Function: send-push-notifications
    ↓
OneSignal REST API
    ↓
Push to all subscribers with matching tag
```

### 3.2 Google Routes API
- **Purpose**: Real-time traffic speed and duration
- **Integration**: `get-traffic-data` Edge Function
- **Data flow**: TrafficLine.tsx → Edge Function → Google API → Speed calculation

### 3.3 Weather API
- **Integration**: `get-weather-forecast` Edge Function
- **Display**: WeatherForecast.tsx component

---

## 4. Data Processing & Algorithms

### Traffic Prediction System

**Key Algorithm**: Historical pattern matching with majority voting

```typescript
// Pseudocode for prediction logic
function predictTraffic(street, direction, targetTime) {
  // 1. Fetch 4 weeks (28 days) of historical data
  const reports = fetchReports(street, last28Days)

  // 2. Filter to same day of week
  const todayDayOfWeek = new Date().getDay()
  const relevantReports = reports.filter(r =>
    r.dayOfWeek === todayDayOfWeek &&
    r.direction === direction
  )

  // 3. Group into time intervals (5-min, 10-min, 30-min, or 1-hour blocks)
  const intervals = groupIntoIntervals(relevantReports, intervalSize)

  // 4. Majority voting within each interval
  intervals.forEach(interval => {
    const statusCounts = countStatuses(interval.reports)
    interval.predictedStatus = getMostFrequent(statusCounts)
  })

  // 5. Return predictions
  return intervals
}
```

**Components using this pattern:**
- `PredictedTraffic.tsx` - Next 60 minutes (5-min intervals)
- `GreenWave.tsx` - Optimal departure time (10-min intervals)
- `WeeklyTimeline.tsx` - Last 7 days (30-min blocks, 5:00-22:00)
- `TodayTimeline.tsx` - Full day (1-hour blocks)

---

## 5. Testing Strategy

### Current State
⚠️ **No tests currently exist** in the project

### Recommended Testing Pyramid

```
      /\
     /E2E\          End-to-End (5%)
    /------\
   /Integra\        Integration (15%)
  /----------\
 / Unit Tests \     Unit Tests (80%)
/--------------\
```

---

## 6. Unit Testing Strategy

### 6.1 What to Test with Unit Tests

#### **A. Utility Functions (High Priority)**
Pure functions with no side effects - easiest to test, highest value.

**Files to test:**
- `src/utils/trafficCalculations.ts`
- `src/utils/trafficPrediction.ts`
- `src/utils/onesignal.ts`

**Example test cases:**

```typescript
// trafficCalculations.test.ts
describe('calculateWeeklyTrafficBlocks', () => {
  it('should return 7 days of data', () => {
    const reports = mockReports();
    const result = calculateWeeklyTrafficBlocks(reports);
    expect(result).toHaveLength(7);
  });

  it('should create 34 blocks per day (5:00-22:00)', () => {
    const reports = mockReports();
    const result = calculateWeeklyTrafficBlocks(reports);
    result.forEach(day => {
      expect(day.blocks).toHaveLength(34);
    });
  });

  it('should use majority voting for status determination', () => {
    const reports = [
      { status: 'stoi', reported_at: '2025-12-12T10:15:00Z', direction: 'do centrum' },
      { status: 'stoi', reported_at: '2025-12-12T10:20:00Z', direction: 'do centrum' },
      { status: 'jedzie', reported_at: '2025-12-12T10:25:00Z', direction: 'do centrum' },
    ];
    const result = calculateWeeklyTrafficBlocks(reports);
    const block = result[0].blocks.find(b => b.hour === 10 && b.minute === 0);
    expect(block.status).toBe('stoi'); // 2 stoi vs 1 jedzie
  });

  it('should handle empty reports with neutral status', () => {
    const reports = [];
    const result = calculateWeeklyTrafficBlocks(reports);
    expect(result[0].blocks[0].status).toBe('neutral');
  });
});

describe('parseReportTime', () => {
  it('should parse database timestamp format', () => {
    const timestamp = '2025-11-28 04:19:51.686+00';
    const result = parseReportTime(timestamp);
    expect(result).toBeInstanceOf(Date);
    expect(result.getUTCFullYear()).toBe(2025);
  });

  it('should handle ISO format', () => {
    const timestamp = '2025-11-28T04:19:51.686Z';
    const result = parseReportTime(timestamp);
    expect(result).toBeInstanceOf(Date);
  });
});

describe('getStatusForTimeFromGrid', () => {
  it('should round down to nearest 30-minute block', () => {
    const weeklyData = mockWeeklyData();
    const result = getStatusForTimeFromGrid(weeklyData, 10, 45); // 10:45
    // Should query 10:30 block
    expect(result).toBeDefined();
  });

  it('should index by day of week correctly', () => {
    const weeklyData = mockWeeklyData();
    const result = getStatusForTimeFromGrid(weeklyData, 10, 0);
    // Monday = 0, Sunday = 6
    expect(Object.keys(result)).toContain('0');
  });
});
```

#### **B. Business Logic Functions**
Logic that can be extracted from components.

**Examples:**
- Speed calculation from distance/duration
- Status color mapping
- Time interval grouping
- Vote counting algorithms

```typescript
// speedCalculation.test.ts
describe('calculateAverageSpeed', () => {
  it('should convert m/s to km/h correctly', () => {
    const distance = 10000; // 10km in meters
    const duration = 600;   // 10 minutes in seconds
    const speed = (distance / 1000) / (duration / 3600);
    expect(speed).toBe(60); // 60 km/h
  });

  it('should handle zero duration gracefully', () => {
    const speed = calculateAverageSpeed(10000, 0);
    expect(speed).toBe(0); // or throw error
  });
});

// statusMapping.test.ts
describe('getStatusColor', () => {
  it('should return correct color for each status', () => {
    expect(getStatusColor('stoi')).toBe('bg-traffic-stoi');
    expect(getStatusColor('toczy_sie')).toBe('bg-traffic-toczy');
    expect(getStatusColor('jedzie')).toBe('bg-traffic-jedzie');
    expect(getStatusColor('neutral')).toBe('bg-traffic-neutral');
  });

  it('should default to neutral for unknown status', () => {
    expect(getStatusColor('unknown')).toBe('bg-traffic-neutral');
  });
});
```

#### **C. Custom Hooks**
React hooks can be tested with `@testing-library/react-hooks`.

**Files to test:**
- Any custom hooks in `src/hooks/`

```typescript
// useTrafficReports.test.ts
import { renderHook, waitFor } from '@testing-library/react';

describe('useTrafficReports', () => {
  it('should fetch reports for selected street', async () => {
    const { result } = renderHook(() => useTrafficReports('Borowska'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });

  it('should refetch when street changes', async () => {
    const { result, rerender } = renderHook(
      ({ street }) => useTrafficReports(street),
      { initialProps: { street: 'Borowska' } }
    );

    rerender({ street: 'Grabiszyńska' });

    await waitFor(() => {
      expect(result.current.data.street).toBe('Grabiszyńska');
    });
  });
});
```

---

### 6.2 Component Unit Testing

Use **React Testing Library** + **Vitest** for component tests.

#### **Testing Philosophy**
- Test user behavior, not implementation details
- Query by accessible roles/labels, not CSS selectors
- Avoid testing internal state

**Example - Legend component:**
```typescript
// Legend.test.tsx
import { render, screen } from '@testing-library/react';
import { Legend } from './Legend';

describe('Legend', () => {
  it('should render all traffic statuses', () => {
    render(<Legend />);

    expect(screen.getByText('Stoi')).toBeInTheDocument();
    expect(screen.getByText('Toczy się')).toBeInTheDocument();
    expect(screen.getByText('Jedzie')).toBeInTheDocument();
  });

  it('should display correct colors', () => {
    const { container } = render(<Legend />);

    const stoiIndicator = container.querySelector('.bg-traffic-stoi');
    expect(stoiIndicator).toBeInTheDocument();
  });
});
```

**Example - Traffic report buttons:**
```typescript
// TrafficButtons.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Index } from '@/pages/Index';

describe('Traffic Reporting', () => {
  it('should show all three status buttons', () => {
    render(<Index />);

    expect(screen.getByRole('button', { name: /stoi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toczy się/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /jedzie/i })).toBeInTheDocument();
  });

  it('should submit report when button clicked', async () => {
    const mockSubmit = vi.fn();
    render(<Index onSubmitReport={mockSubmit} />);

    const stoiButton = screen.getByRole('button', { name: /stoi/i });
    fireEvent.click(stoiButton);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith('stoi');
    });
  });

  it('should show success message after submission', async () => {
    render(<Index />);

    const stoiButton = screen.getByRole('button', { name: /stoi/i });
    fireEvent.click(stoiButton);

    await waitFor(() => {
      expect(screen.getByText(/zgłoszenie wysłane/i)).toBeInTheDocument();
    });
  });
});
```

---

## 7. Integration Testing

### 7.1 API Integration Tests
Test Edge Functions with real Supabase connection (test database).

```typescript
// submit-traffic-report.integration.test.ts
describe('submit-traffic-report Edge Function', () => {
  it('should insert report into database', async () => {
    const response = await fetch('http://localhost:54321/functions/v1/submit-traffic-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        street: 'Borowska',
        status: 'stoi',
        direction: 'do centrum',
        speed: 25
      })
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.id).toBeDefined();

    // Verify in database
    const { data: report } = await supabase
      .from('traffic_reports')
      .select('*')
      .eq('id', data.id)
      .single();

    expect(report.street).toBe('Borowska');
    expect(report.speed).toBe(25);
  });

  it('should validate required fields', async () => {
    const response = await fetch('http://localhost:54321/functions/v1/submit-traffic-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ street: 'Borowska' }) // Missing status and direction
    });

    expect(response.status).toBe(400);
  });

  it('should handle database errors gracefully', async () => {
    // Simulate database failure
    // ...test error handling
  });
});
```

### 7.2 Component Integration Tests
Test components with real React Query and API mocks.

```typescript
// TrafficLine.integration.test.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { TrafficLine } from './TrafficLine';

describe('TrafficLine Integration', () => {
  it('should fetch and display traffic data', async () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <TrafficLine street="Borowska" direction="do centrum" />
      </QueryClientProvider>
    );

    // Shows loading state
    expect(screen.getByText(/ładowanie/i)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/średnia prędkość/i)).toBeInTheDocument();
    });

    // Verify speed is displayed
    expect(screen.getByText(/km\/h/)).toBeInTheDocument();
  });
});
```

---

## 8. End-to-End (E2E) Testing

### 8.1 Recommended Tool: Playwright

**Critical user journeys to test:**

```typescript
// e2e/traffic-reporting.spec.ts
import { test, expect } from '@playwright/test';

test('User can report traffic status', async ({ page }) => {
  // 1. Navigate to app
  await page.goto('http://localhost:8080');

  // 2. Select street
  await page.getByRole('combobox', { name: /wybierz ulicę/i }).click();
  await page.getByRole('option', { name: 'Borowska' }).click();

  // 3. Select direction
  await page.getByRole('button', { name: /do centrum/i }).click();

  // 4. Submit report
  await page.getByRole('button', { name: /stoi/i }).click();

  // 5. Verify success message
  await expect(page.getByText(/zgłoszenie wysłane/i)).toBeVisible();

  // 6. Verify traffic line updates
  await expect(page.locator('.traffic-status')).toHaveClass(/stoi/);
});

test('User can subscribe to push notifications', async ({ page, context }) => {
  // Grant notification permissions
  await context.grantPermissions(['notifications']);

  await page.goto('http://localhost:8080/push');

  // Subscribe to street
  await page.getByRole('button', { name: /subskrybuj borowska/i }).click();

  // Verify subscription status
  await expect(page.getByText(/subskrybujesz/i)).toBeVisible();
});

test('User can redeem coupon with QR code', async ({ page }) => {
  await page.goto('http://localhost:8080/kupon?id=test-coupon-123');

  // Verify coupon details
  await expect(page.getByText(/20% zniżki/i)).toBeVisible();

  // Scan QR button
  await page.getByRole('button', { name: /zeskanuj/i }).click();

  // Mock QR camera permission
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.resolve({
      getTracks: () => []
    });
  });

  // Verify redemption
  await expect(page.getByText(/kupon wykorzystany/i)).toBeVisible();
});
```

**Other E2E test scenarios:**
- Authentication flow (login, signup, logout)
- Street selection and direction filtering
- Viewing traffic statistics
- Chat message submission
- Viewing weekly timeline
- Weather forecast display

---

## 9. Testing Infrastructure Setup

### 9.1 Install Testing Dependencies

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npm install -D @playwright/test
```

### 9.2 Vitest Configuration

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/types.ts',
        'src/components/ui/**', // shadcn components
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

### 9.3 Test Setup File

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock OneSignal
global.OneSignal = {
  init: vi.fn(),
  Slidedown: { promptPush: vi.fn() },
  User: {
    addTag: vi.fn(),
    removeTag: vi.fn(),
    getTags: vi.fn(() => Promise.resolve({}))
  },
  Notifications: {
    addEventListener: vi.fn(),
    requestPermission: vi.fn(() => Promise.resolve('granted'))
  }
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock as any;
```

### 9.4 Package.json Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 10. Test Coverage Goals

### Recommended Coverage Targets

| Category | Target | Priority |
|----------|--------|----------|
| Utility Functions | 90%+ | 🔴 Critical |
| Business Logic | 80%+ | 🔴 Critical |
| Components | 70%+ | 🟡 High |
| Hooks | 80%+ | 🟡 High |
| Pages | 50%+ | 🟢 Medium |
| Edge Functions | 70%+ | 🟡 High |

### High-Value Test Areas (Start Here)

1. ✅ **Traffic Calculations** (`trafficCalculations.ts`)
   - Majority voting algorithm
   - Time interval grouping
   - Day-of-week filtering

2. ✅ **Traffic Prediction** (`trafficPrediction.ts`)
   - Historical pattern matching
   - Prediction accuracy

3. ✅ **Speed Calculation** (TrafficLine component)
   - Distance/duration to km/h conversion
   - Data flow from Google API

4. ✅ **Form Validation**
   - Traffic report submission
   - Chat message validation
   - Coupon redemption

5. ✅ **OneSignal Integration** (`onesignal.ts`)
   - Tag subscription/unsubscription
   - Permission handling

---

## 11. Testing Best Practices

### DO ✅
- Write tests before fixing bugs (TDD for bug fixes)
- Test user behavior, not implementation
- Use descriptive test names: `it('should calculate average speed from distance and duration')`
- Mock external dependencies (API calls, localStorage, OneSignal)
- Use factories/fixtures for test data
- Test edge cases (empty arrays, null values, timezone issues)
- Keep tests isolated and independent

### DON'T ❌
- Test implementation details (internal state, private methods)
- Write tests that depend on execution order
- Mock too much (makes tests brittle)
- Test third-party libraries (shadcn-ui, React Query)
- Ignore failing tests
- Test everything (focus on business logic)

---

## 12. Continuous Integration (CI)

### Recommended GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload E2E artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 13. Migration Plan

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Vitest configuration
- [ ] Create test utilities and mocks
- [ ] Write tests for `trafficCalculations.ts`
- [ ] Write tests for `trafficPrediction.ts`
- [ ] Achieve 80%+ utility function coverage

### Phase 2: Components (Week 3-4)
- [ ] Test Legend component
- [ ] Test TrafficLine component (with mocked API)
- [ ] Test PredictedTraffic component
- [ ] Test WeeklyTimeline component
- [ ] Achieve 60%+ component coverage

### Phase 3: Integration (Week 5-6)
- [ ] Set up Supabase test database
- [ ] Write integration tests for Edge Functions
- [ ] Test React Query integration
- [ ] Test form submissions end-to-end

### Phase 4: E2E (Week 7-8)
- [ ] Set up Playwright
- [ ] Write critical path E2E tests
- [ ] Set up CI/CD pipeline
- [ ] Establish coverage thresholds

---

## 14. Key Insights for Developers

### What Makes This App Unique

1. **Real-time Traffic Prediction**
   - Uses 4 weeks of historical data
   - Day-of-week filtering (Mondays predict Mondays)
   - Majority voting across time intervals
   - Multiple granularities (5-min, 10-min, 30-min, 1-hour)

2. **Tag-Based Push Notifications**
   - Per-street subscriptions via OneSignal tags
   - Foreground notification handling
   - Complex subscription management

3. **QR Code Coupon System**
   - Camera integration with @zxing/browser
   - Race condition prevention
   - Status lifecycle management

4. **Speed Data Flow**
   - Google Routes API → Edge Function → TrafficLine → Speed calc → Report submission
   - Ref-based architecture to avoid stale closures

### Common Pitfalls to Test

1. **Timezone Issues**
   - Database stores UTC timestamps
   - Frontend displays local time
   - Day-of-week calculations can be off by one

2. **Stale Closure Issues**
   - Speed value not updating in button handlers
   - Use refs for latest values

3. **OneSignal Subscription State**
   - Tag persistence
   - Permission revocation handling
   - Android "Linux armv8l" display issue (not a bug)

4. **Rate Limiting**
   - Chat message throttling
   - Traffic report cooldown
   - Need to test limit enforcement

---

## Conclusion

This architecture is designed for **real-time traffic monitoring** with a focus on **user-generated data** and **predictive analytics**. The testing strategy prioritizes:

1. **Utility functions** (pure, easy to test, high value)
2. **Business logic** (traffic calculations, predictions)
3. **User interactions** (reporting, subscriptions, chat)
4. **Integration points** (Edge Functions, external APIs)
5. **Critical paths** (E2E for core flows)

Start with unit tests for utilities, gradually add component tests, then integration tests, and finally E2E tests for the most critical user journeys.

**Target: 70% overall code coverage with 90%+ on business logic.**
