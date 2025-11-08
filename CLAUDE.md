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

## Important Files

### Configuration
- `vite.config.ts` - Vite configuration with path alias `@/` → `./src/`
- `tsconfig.json` - TypeScript config with relaxed rules (noImplicitAny: false, strictNullChecks: false)
- `index.html` - OneSignal initialization, Google Analytics, AdSense

### Components
- `src/components/TrafficLine.tsx` - Visual traffic status line
- `src/components/TodayTimeline.tsx` - Today's traffic timeline
- `src/components/WeeklyTimeline.tsx` - Weekly traffic patterns
- `src/components/PredictedTraffic.tsx` - AI/ML traffic predictions
- `src/components/StreetVoting.tsx` - Street improvement voting
- `src/components/StreetChat.tsx` - Street-specific chat
- `src/components/SmsSubscription.tsx` - SMS subscription feature

### Pages
- `src/pages/Index.tsx` - Main traffic reporting page
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

## Development Notes

### Path Aliases
- Use `@/` to import from `src/` directory: `import { Button } from "@/components/ui/button"`

### TypeScript
- Project uses relaxed TypeScript settings for rapid development
- Allow implicit any, unused parameters, and nullable types

### Styling
- Uses Tailwind CSS with custom traffic color palette
- shadcn-ui components in `src/components/ui/`
- Custom animations with `tailwindcss-animate`

### Environment Variables
Required in `.env` file:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

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
