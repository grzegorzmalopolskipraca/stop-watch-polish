# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Polish traffic monitoring web application ("Czy ulica stoi?") built with React, TypeScript, Vite, and Supabase. Users can report and view real-time traffic conditions on streets in Wrocław, Poland. The app includes push notifications via OneSignal, traffic predictions, voting, chat, and other community features.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **UI Framework:** shadcn-ui (Radix UI components + Tailwind CSS)
- **Backend:** Supabase (PostgreSQL database + Edge Functions)
- **Push Notifications:** OneSignal Web SDK v16
- **State Management:** @tanstack/react-query
- **Routing:** react-router-dom
- **Charts:** recharts
- **Notifications:** sonner

## Development Commands

```bash
# Install dependencies
npm i

# Start development server (runs on http://[::]:8080)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn-ui components (Radix + Tailwind)
│   └── *.tsx           # Feature components (Traffic, Voting, Chat, etc.)
├── pages/              # Route pages (Index, Push, Statystyki, etc.)
├── integrations/       # External service integrations
│   └── supabase/       # Supabase client and types
├── utils/              # Utility functions
│   ├── onesignal.ts    # OneSignal subscription helpers
│   └── trafficCalculations.ts
├── hooks/              # React hooks
├── lib/                # Library configurations
├── App.tsx             # Main app with routing
└── main.tsx            # Entry point

supabase/
├── functions/          # Supabase Edge Functions
└── migrations/         # Database migrations

public/
├── OneSignalSDKWorker.js  # Service worker for push notifications
└── *.png, *.ico           # Static assets
```

## Key Architecture Patterns

### Route Structure
- App.tsx defines all routes using react-router-dom
- **Polish route names:** `/o-projekcie`, `/regulamin`, `/kontakt`, `/statystyki`, `/push`, `/rss`, `/coupons`
- Catch-all `*` route must be LAST in route definitions
- Main page (`/`) is Index.tsx with street selection and traffic reporting

### Supabase Integration
- Client initialized in `src/integrations/supabase/client.ts`
- Uses environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Database types auto-generated in `src/integrations/supabase/types.ts`
- Edge Functions in `supabase/functions/` for backend logic (push notifications, traffic data, weather, etc.)

### OneSignal Push Notifications
- **Critical:** OneSignal SDK v16 initialization in `index.html` (lines 40-168)
- Service worker at `/public/OneSignalSDKWorker.js` must exist
- Helper functions in `src/utils/onesignal.ts` for subscribe/unsubscribe/check
- Uses **tag-based subscriptions:** `street_<streetname>` format for per-street notifications
- **Foreground notifications:** Custom handler in index.html (line 63) displays notifications even when page is open
- **Known behavior:** Android Chrome subscriptions display as "Linux armv8l" in OneSignal dashboard - this is expected

### State Management
- React Query (@tanstack/react-query) for server state
- Local state with useState/useEffect for UI state
- LocalStorage for persistence (selected street, subscription status)

### Street Configuration
- Hardcoded list of streets in `STREETS` array in Index.tsx
- Currently 13 streets in Wrocław: Borowska, Buforowa, Grabiszyńska, Grota Roweckiego, Karkonoska, Ołtaszyńska, Opolska, Parafialna, Powstańców Śląskich, Radosna, Sudecka, Ślężna, Zwycięska

### Traffic Status Types
- **stoi** (red) - stopped/heavy traffic
- **toczy_sie** (yellow/orange) - moving slowly
- **jedzie** (green) - flowing normally
- **neutral** (grey) - no data available

### Traffic Prediction Logic
**CRITICAL: Data Filtering for Predictions**

All traffic prediction components (`nextGreenSlot`, `nextToczySlot`, `nextStoiSlot`, `PredictedTraffic`) must filter data consistently:

1. **Historical Data Period:** Fetch 4 weeks (28 days) of traffic reports from database
2. **Day-of-Week Filtering:** Filter to same day of week as current day (e.g., only Mondays if today is Monday)
3. **Direction Filtering:** Filter by selected direction (`do centrum` or `od centrum`)
4. **Time Window Aggregation:** Group reports into time intervals and use majority vote to determine status

**Example pattern (Index.tsx lines 143-294):**
```typescript
const now = new Date();
const todayDayOfWeek = now.getDay();

const relevantReports = weeklyReports.filter((r) => {
  const reportDate = new Date(r.reported_at);
  return reportDate.getDay() === todayDayOfWeek && r.direction === direction;
});
```

**Common Mistake to Avoid:**
- ❌ Don't use all 7 days of the week for predictions (different traffic patterns)
- ❌ Don't ignore direction filter (traffic varies by direction)
- ❌ Don't declare duplicate `const now` variables in same scope
- ✅ All prediction useMemo hooks must include `direction` in dependency array

### Traffic Calculation Intervals
- **PredictedTraffic:** 5-minute intervals (12 per hour) for next hour forecast
- **WeeklyTimeline:** 30-minute blocks from 5:00-22:00 for last 7 days
- **GreenWave:** 10-minute intervals analyzed over last 7 days
- **TodayTimeline:** 1-hour blocks for full 24-hour day
- All use majority vote when multiple reports exist in same time window

## Important Files

### Configuration
- `vite.config.ts` - Vite configuration with path alias `@/` → `./src/`
- `tsconfig.json` - TypeScript config with relaxed rules (noImplicitAny: false, strictNullChecks: false)
- `index.html` - OneSignal initialization, Google Analytics, AdSense

### Components
- `src/components/TrafficLine.tsx` - Visual traffic status line
- `src/components/TodayTimeline.tsx` - Today's traffic timeline (1-hour intervals, 24 hours)
- `src/components/WeeklyTimeline.tsx` - Weekly traffic patterns (30-min blocks, 5:00-22:00, last 7 days)
- `src/components/PredictedTraffic.tsx` - Traffic predictions (5-min intervals, next 60 minutes)
  - Uses **alternating legend layout**: time labels alternate above/below colored rectangles for better mobile spacing
  - Title: "Prognoza na najbliższą godzinę"
  - Subtitle: "Wyjedź, kiedy masz zielone"
- `src/components/GreenWave.tsx` - Optimal departure time recommendations (10-min intervals)
  - Title: "Zielona fala"
- `src/components/CommuteOptimizer.tsx` - Commute planning ("Jeździsz do pracy tylko kilka razy w tygodniu?")
- `src/components/WeatherForecast.tsx` - Weather for cyclists/motorcyclists
  - Title: "Jeździsz rowerem lub motocyklem?"
  - Metadata hidden: location, timestamp, source
- `src/components/StreetVoting.tsx` - Street improvement voting ("Głosuj którą ulicę dodać")
- `src/components/StreetChat.tsx` - Street-specific chat
  - Title: "Czat / cb radio"
  - Description: "Czat dla sąsiadów. Napisz, dokąd jedziesz — ktoś może Cię zabrać i zmniejszyć korki"
- `src/components/SmsSubscription.tsx` - SMS subscription feature

### Pages
- `src/pages/Index.tsx` - Main traffic reporting page
  - **Bottom Navigation Menu**: Fixed bottom menu with 6 items for mobile navigation
    - Icons aligned horizontally using fixed text height (`h-8 flex items-center`)
    - Smooth scrolling with header offset compensation
    - Menu items: "Kiedy jechać?", "Stan ruchu", "Zgłoś", "Na rowerze", "CB radio", "Jak korzystać"
  - **Section IDs for Navigation**:
    - `#stan-ruchu` - Today's Timeline ("Dziś: stan ruchu")
    - `#zglos` - Incident Reports ("Zgłoś zdarzenie na drodze")
    - `#na-rowerze` - Weather Forecast
    - `#cb-radio` - Street Chat
    - `#jak-korzystac` - Support Section ("Nie chcę tracić życia w korkach, dlatego")
  - **Page Structure Order** (from top to bottom):
    1. Sticky header with street selector and direction filters
    2. Live traffic label: "Korki na żywo na podstawie zgłoszeń mieszkańców"
    3. Current status box with advice ("Możesz ruszać :)", "Jedź jeśli musisz", "Lepiej wyjedź później")
    4. Report buttons (Stoi, Toczy się, Jedzie)
    5. PredictedTraffic (5-min intervals)
    6. "Planuj. Jedź, gdy ruch jest mniejszy:" section
    7. GreenWave
    8. CommuteOptimizer
    9. TodayTimeline
    10. WeeklyTimeline
    11. Last update info
    12. Incident reports
    13. SMS subscription
    14. WeatherForecast
    15. StreetChat
    16. Footer with support and usage sections
- `src/pages/Push.tsx` - Push notification management and testing
- `src/pages/Statystyki.tsx` - Traffic statistics
- `src/pages/Coupons.tsx` - Coupons/rewards feature

## OneSignal Debugging

If push notifications aren't working, refer to these debugging files:
- `ONESIGNAL_FIX_SUMMARY.md` - Complete fix documentation
- `NOTIFICATION_DEBUGGING_GUIDE.md` - Step-by-step debugging guide
- `ANDROID_FIX.md` - Android-specific issues

Key debugging steps:
1. Check console for `[OneSignal]` prefixed logs
2. Verify service worker is registered at `/OneSignalSDKWorker.js`
3. Ensure user has both tags: `test_device` and `street_test_device`
4. Filter OneSignal dashboard by tags to find subscriptions
5. Use `/push` page "Sprawdź pełny status" button to auto-fix missing tags

## Database Schema

### traffic_reports Table
Primary table storing all traffic status reports:
- `id` (string) - UUID primary key
- `street` (string) - Street name
- `status` (string) - Traffic status: "stoi", "toczy_sie", "jedzie"
- `direction` (string) - Traffic direction: "do centrum", "od centrum"
- `reported_at` (string/timestamp) - When report was created
- `created_at` (string/timestamp) - Database insert time
- `user_fingerprint` (string, nullable) - Anonymous user identifier

**Query Patterns:**
- Always filter by `street`, `direction`, and time range
- Use `.gte("reported_at", date)` for historical data
- Order by `reported_at` descending for most recent first

## Development Notes

### Path Aliases
- Use `@/` to import from `src/` directory: `import { Button } from "@/components/ui/button"`

### TypeScript
- Project uses relaxed TypeScript settings for rapid development
- Allow implicit any, unused parameters, and nullable types
- When adding new filtering logic, ensure TypeScript interfaces match database schema

### Styling
- Uses Tailwind CSS with custom traffic color palette:
  - `bg-traffic-stoi` - Red for stopped traffic
  - `bg-traffic-toczy` - Yellow/orange for slow traffic
  - `bg-traffic-jedzie` - Green for flowing traffic
  - `bg-traffic-neutral` - Grey for no data
- shadcn-ui components in `src/components/ui/`
- Custom animations with `tailwindcss-animate`
- **Mobile-First Considerations**:
  - Alternating legend layouts for small screens: see PredictedTraffic (time labels above/below rectangles)
  - Fixed-height text containers for icon alignment: `h-8 flex items-center` pattern in bottom menu
  - Header offset scrolling: Calculate sticky header height and subtract from scroll position
  - Reduced margins with increased gaps: `px-1 gap-2` instead of `px-2 gap-1` for better spacing

### Environment Variables
Required in `.env` file:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### Common Development Patterns
1. **Adding new time-based visualization:**
   - Define interval size (5min, 10min, 30min, 1hr)
   - Filter reports by street, direction, and day-of-week
   - Use majority vote for status in each interval
   - Display with appropriate color coding

2. **Modifying prediction logic:**
   - Update data fetch to include sufficient history (4 weeks recommended)
   - Ensure day-of-week and direction filtering
   - Update useMemo dependency arrays
   - Avoid duplicate variable declarations in same scope

3. **Adding navigation to sections:**
   - Add `id="section-name"` to the target section element
   - For sticky header pages, implement header-offset scrolling:
     ```typescript
     const element = document.getElementById('section-id');
     const header = document.querySelector('header');
     const headerHeight = header?.offsetHeight || 0;
     const elementPosition = element?.getBoundingClientRect().top + window.pageYOffset;
     if (elementPosition) {
       window.scrollTo({ top: elementPosition - headerHeight - 10, behavior: 'smooth' });
     }
     ```
   - For top-of-page scrolling: `window.scrollTo({ top: 0, behavior: 'smooth' })`

4. **Maintaining icon alignment in navigation menus:**
   - Use fixed-height containers for text labels: `h-8 flex items-center`
   - Add `flex-shrink-0` to icons to prevent distortion
   - Use consistent padding: `pt-2 pb-1` instead of `py-2 justify-center`
   - This ensures icons stay aligned even when text wraps to multiple lines

### Supabase Edge Functions
Located in `supabase/functions/`:
- `send-push-notifications` - Send notifications to subscribed users
- `submit-traffic-report` - Process traffic reports
- `get-traffic-data` - Fetch traffic data
- `get-weather-forecast` - Weather integration
- `fetch-rss-feed` - RSS feed integration
- And more (see `supabase/functions/` for full list)

## Lovable Integration

This project was created with [Lovable](https://lovable.dev/projects/7e6d938d-cb5d-485a-93c6-06ffdfa54334). Changes made via Lovable are automatically committed to this repo.

## Language

- **UI Language:** Polish (all user-facing text should be in Polish)
- **Code Comments:** Can be in English or Polish
- **Console Logs:** Mix of English and Polish
