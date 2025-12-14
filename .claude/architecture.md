# Project Architecture

## System Overview

**Czy ulica stoi?** is a Polish traffic monitoring web application for Wrocław that provides real-time traffic reports, predictions, and community features.

### Architecture Pattern
- **Type:** Client-Server with Real-time Database
- **Frontend:** SPA (Single Page Application) with React 18
- **Backend:** Serverless (Supabase Edge Functions + PostgreSQL)
- **Notifications:** Push notification service (OneSignal)

## Technology Stack

### Frontend (Client-Side)
```
React 18.3.1
├── TypeScript 5.8.3
├── Vite 5.4.19 (Build tool)
├── React Router 6.30.1 (Routing)
├── React Query 5.83.0 (Server state)
└── shadcn-ui (UI components)
    ├── Radix UI (Headless components)
    └── Tailwind CSS 3.4.17 (Styling)
```

### Backend (Server-Side)
```
Supabase
├── PostgreSQL (Database)
├── Edge Functions (Deno runtime)
├── Auth (User authentication)
├── Storage (File storage)
└── Realtime (WebSocket subscriptions)
```

### External Services
- **OneSignal Web SDK v16** - Push notifications with tag-based subscriptions
- **Google Routes API** - Real-time traffic data
- **Google Analytics** - User behavior tracking

## Project Structure

```
stop-watch-polish/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn-ui components (Radix + Tailwind)
│   │   ├── TrafficLine.tsx # Google Routes API integration
│   │   ├── PredictedTraffic.tsx # Traffic predictions (5-min intervals)
│   │   ├── WeeklyTimeline.tsx   # Weekly patterns (30-min blocks)
│   │   ├── TodayTimeline.tsx    # Today's timeline (1-hour blocks)
│   │   ├── GreenWave.tsx        # Optimal departure times
│   │   └── StreetChat.tsx       # Street-specific chat
│   ├── pages/              # Route pages
│   │   ├── Index.tsx       # Main traffic reporting (/)
│   │   ├── Push.tsx        # Push notifications (/push)
│   │   ├── Statystyki.tsx  # Statistics (/statystyki)
│   │   ├── Kupon.tsx       # Coupon redemption (/kupon?id=)
│   │   └── Coupons.tsx     # Coupon management (/coupons)
│   ├── integrations/
│   │   └── supabase/       # Supabase client & types
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   │   ├── onesignal.ts    # Push notification helpers
│   │   └── trafficCalculations.ts
│   ├── lib/                # Library configurations
│   ├── App.tsx             # Main app with routing
│   └── main.tsx            # Entry point
├── supabase/
│   ├── functions/          # Edge Functions (Deno)
│   │   ├── submit-traffic-report/
│   │   ├── send-push-notifications/
│   │   ├── get-traffic-data/
│   │   └── ...
│   └── migrations/         # Database migrations
├── public/
│   ├── OneSignalSDKWorker.js  # Service worker
│   └── *.png, *.ico           # Static assets
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions CI/CD
├── .claude/                # Claude CLI configuration
├── 10devs/                 # Project documentation
└── index.html              # OneSignal initialization

```

## Data Flow Architecture

### Traffic Reporting Flow
```
User clicks "Stoi" button
    ↓
Index.tsx: submitReport(status)
    ↓
POST to /submit-traffic-report Edge Function
    ↓
Validate + Insert to traffic_reports table
    ↓
Trigger send-push-notifications Edge Function
    ↓
OneSignal API sends notifications to subscribers
    ↓
Users with street_<streetname> tag receive push
```

### Traffic Prediction Flow
```
Component mounts (PredictedTraffic.tsx)
    ↓
Query traffic_reports (last 4 weeks)
    ↓
Filter by:
  - Same day of week (e.g., only Mondays)
  - Selected direction (do centrum / od centrum)
  - Time range
    ↓
Group into time intervals (5-min, 10-min, 30-min, or 1-hour)
    ↓
Majority vote for status in each interval
    ↓
Render color-coded timeline
```

### Real-time Speed Flow
```
TrafficLine.tsx mounts
    ↓
POST to /get-traffic-data Edge Function
    ↓
Edge Function calls Google Routes API
    ↓
Calculate: speed = (distance/1000) / (duration/3600) km/h
    ↓
Return to TrafficLine
    ↓
Display in gauge + call onSpeedUpdate(speed)
    ↓
Index.tsx stores in currentSpeedRef
    ↓
User submits traffic report → includes speed
```

## Component Architecture

### Page Components (Routes)
- `Index.tsx` - Main traffic reporting (street selection, status buttons, predictions)
- `Push.tsx` - Push notification subscription management
- `Statystyki.tsx` - Traffic statistics and analytics
- `Kupon.tsx` - QR code coupon redemption
- `Coupons.tsx` - Coupon management interface

### Feature Components
- `TrafficLine.tsx` - Real-time traffic visualization with Google Routes API
- `PredictedTraffic.tsx` - Next hour prediction (5-min intervals)
- `WeeklyTimeline.tsx` - Last 7 days pattern (30-min blocks, 5:00-22:00)
- `TodayTimeline.tsx` - Today's full timeline (1-hour blocks)
- `GreenWave.tsx` - Optimal departure time recommendations (10-min intervals)
- `StreetChat.tsx` - Street-specific chat with rate limiting

### UI Components (shadcn-ui)
Located in `src/components/ui/`:
- Button, Card, Dialog, Dropdown, Toast, etc.
- Built with Radix UI + Tailwind CSS
- Fully accessible and customizable

## State Management

### Server State (React Query)
- All Supabase queries use `@tanstack/react-query`
- Automatic caching, refetching, and background updates
- Query keys follow pattern: `['traffic-reports', street, direction]`

### Local State (React hooks)
- `useState` - UI state (selected street, direction, loading states)
- `useRef` - Immediate access (currentSpeedRef for speed data)
- `useMemo` - Derived data (filtered reports, aggregated timelines)
- `useEffect` - Side effects (data fetching, subscriptions)

### Persistent State (LocalStorage)
- Selected street: `localStorage.getItem('selectedStreet')`
- OneSignal subscription status: Managed by OneSignal SDK
- User preferences: Theme, notification settings

## Database Schema

### Core Tables

**traffic_reports**
```sql
CREATE TABLE traffic_reports (
  id UUID PRIMARY KEY,
  street TEXT NOT NULL,
  status TEXT NOT NULL,  -- "stoi", "toczy_sie", "jedzie"
  direction TEXT NOT NULL,  -- "do centrum", "od centrum"
  speed NUMERIC,  -- km/h from Google Routes API
  reported_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  user_fingerprint TEXT
);
```

**coupons**
```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY,
  local_id UUID REFERENCES locations(id),
  local_name TEXT,
  discount NUMERIC,
  status TEXT,  -- "active", "redeemed", "used", "expired"
  time_from TIMESTAMP,
  time_to TIMESTAMP,
  image_link TEXT
);
```

**locations**
```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  street TEXT
);
```

## API Integration Patterns

### Supabase Client
```typescript
import { supabase } from "@/integrations/supabase/client";

// Query example
const { data, error } = await supabase
  .from('traffic_reports')
  .select('*')
  .eq('street', selectedStreet)
  .eq('direction', direction)
  .gte('reported_at', startDate)
  .order('reported_at', { ascending: false });
```

### Edge Functions
```typescript
// Located in supabase/functions/<function-name>/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(/* ... */);
  // Business logic
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
});
```

### OneSignal Integration
```typescript
// Initialize in index.html (lines 40-168)
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
  await OneSignal.init({
    appId: "YOUR_APP_ID",
    allowLocalhostAsSecureOrigin: true
  });
});

// Subscribe to street notifications
await OneSignal.User.addTag("street_borowska", "true");
```

## Build & Deployment

### Development
```bash
npm run dev  # Vite dev server on http://[::]:8080
```

### Production Build
```bash
npm run build  # Vite production build → dist/
```

### CI/CD Pipeline (.github/workflows/ci.yml)
```
Trigger: Push to develop, feature/**, or PR
    ↓
Job 1: Code Analysis (non-blocking)
  - ESLint
  - TypeScript check
    ↓
Job 2: Tests (blocking, currently disabled)
  - Vitest unit/integration tests
    ↓
Job 3: Build (blocking)
  - npm ci
  - npm run build
  - Upload artifacts
```

## Security Considerations

### Environment Variables
- `VITE_SUPABASE_URL` - Public (safe to expose)
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Anon key (safe, RLS protected)
- Never commit `.env` file

### Row Level Security (RLS)
- All tables protected by Supabase RLS policies
- Anonymous users can read traffic data
- Authenticated users can submit reports

### Rate Limiting
- Chat messages: 10 messages per user per hour
- Traffic reports: Tracked by user_fingerprint
- Edge Functions: Supabase built-in rate limits

## Performance Optimization

### Code Splitting
- React Router lazy loading for routes
- Dynamic imports for heavy components

### Caching Strategy
- React Query: 5-minute stale time for traffic data
- OneSignal: Service worker caches API responses
- Vite: Asset hashing for long-term caching

### Database Optimization
- Indexes on: street, direction, reported_at
- Query only necessary columns
- Limit result sets with `.limit()`

## Development Patterns

### Path Aliases
```typescript
import { Button } from "@/components/ui/button";  // ✓
import { supabase } from "@/integrations/supabase/client";  // ✓
```

### TypeScript Configuration
- Relaxed settings for rapid development
- `noImplicitAny: false`
- `strictNullChecks: false`

### Traffic Status Colors
```typescript
// Tailwind CSS custom colors
bg-traffic-stoi    // Red - stopped
bg-traffic-toczy   // Yellow/Orange - slow
bg-traffic-jedzie  // Green - flowing
bg-traffic-neutral // Grey - no data
```

## Common Development Tasks

### Adding New Street
1. Add to `STREETS` array in `Index.tsx`
2. No database changes needed

### Adding New Route
1. Create page component in `src/pages/`
2. Add route to `App.tsx` (Polish route names)
3. Ensure catch-all `*` route is LAST

### Adding Time-based Visualization
1. Define interval size (5min, 10min, 30min, 1hr)
2. Filter by street + direction + day-of-week
3. Use majority vote for status
4. Display with traffic color coding

### Debugging OneSignal
1. Check console for `[OneSignal]` logs
2. Verify service worker at `/OneSignalSDKWorker.js`
3. Check tags: `test_device`, `street_<name>`
4. Use `/push` page "Sprawdź pełny status" button

## References

- Full documentation: `10devs/` folder
- PRD: `10devs/PRD.md`
- Architecture details: `10devs/ARCHITECTURE_AND_TESTING.md`
- Technology stack: `10devs/TECHNOLOGY.md`
- CI/CD plan: `10devs/GITHUBACTIONS-PLAN.md`
- AI assistant guide: `CLAUDE.md`
