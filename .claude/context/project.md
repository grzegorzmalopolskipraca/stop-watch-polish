# Project Context: Czy ulica stoi?

## Quick Overview

**Czy ulica stoi?** (Polish: "Is the street stopped?") is a real-time traffic monitoring web application for Wrocław, Poland. Users can report and view traffic conditions, receive push notifications, and access traffic predictions for 13 major streets.

## Project Identity

- **Name:** Czy ulica stoi?
- **Type:** Traffic Monitoring Web Application
- **Location:** Wrocław, Poland
- **Language:** Polish (UI), TypeScript (Code)
- **Owner:** Grzegorz Malopolski (grzegorz.malopolski@ringieraxelspringer.pl)
- **Learning Project:** Part of 10xdevs 2.0 course (https://www.10xdevs.pl/)

## Purpose

Enable Wrocław residents to:
1. **Report** current traffic conditions on major streets
2. **View** real-time traffic status and predictions
3. **Subscribe** to push notifications for specific streets
4. **Plan** optimal departure times using historical data
5. **Engage** with community features (chat, voting, incidents)

## Target Users

### Primary Personas

1. **Daily Commuter (Anna, 32)**
   - Drives to work on Borowska every day
   - Wants to know if she should leave early
   - Uses app 2x daily (morning/evening)

2. **Delivery Driver (Marek, 45)**
   - Makes 20+ deliveries daily across Wrocław
   - Needs real-time traffic updates
   - Relies on push notifications

3. **Business Owner (Katarzyna, 38)**
   - Restaurant on Grabiszyńska
   - Monitors traffic to plan deliveries
   - Uses coupon system for marketing

## Key Features

### 1. Traffic Reporting
- Real-time status submission: "Stoi" (stopped), "Toczy się" (moving), "Jedzie" (flowing)
- Direction-aware: "do centrum" (to center), "od centrum" (from center)
- Includes current speed from Google Routes API

### 2. Traffic Predictions
- **PredictedTraffic:** Next hour in 5-minute intervals
- **WeeklyTimeline:** Last 7 days in 30-minute blocks (5:00-22:00)
- **TodayTimeline:** Full 24-hour day in 1-hour blocks
- **GreenWave:** Optimal departure times in 10-minute intervals

### 3. Push Notifications (OneSignal)
- Tag-based subscriptions: `street_<streetname>`
- Foreground notifications (visible even when page is open)
- Customizable per street

### 4. Community Features
- Street-specific chat with rate limiting
- Incident reports (accidents, roadwork)
- Voting on traffic conditions
- Carpooling coordination

### 5. Coupon System
- QR code-based redemption
- Local business partnerships
- Status tracking: active, redeemed, used, expired

## Monitored Streets (13)

1. Borowska
2. Buforowa
3. Grabiszyńska
4. Grota Roweckiego
5. Karkonoska
6. Ołtaszyńska
7. Opolska
8. Parafialna
9. Powstańców Śląskich
10. Radosna
11. Sudecka
12. Ślężna
13. Zwycięska

## Technology Philosophy

### Why These Choices?

**React + TypeScript + Vite:**
- Fast development with HMR
- Type safety without strictness (relaxed TypeScript config)
- Modern tooling, minimal configuration

**Supabase (not custom backend):**
- Serverless - no server maintenance
- Built-in auth, database, edge functions
- Real-time subscriptions out-of-the-box
- PostgreSQL for reliable data storage

**shadcn-ui (not Material-UI or Chakra):**
- Copy-paste components (full ownership)
- Built on Radix UI (accessibility)
- Tailwind CSS for rapid styling
- No large bundle size

**OneSignal (not Firebase Cloud Messaging):**
- Easier integration for web push
- Tag-based segmentation
- Built-in analytics
- Free tier sufficient

**React Query (not Redux):**
- Server state management, not global state
- Automatic caching and refetching
- Less boilerplate than Redux
- Perfect for data-fetching heavy apps

## Project Constraints

### What We Do

- ✅ Real-time traffic monitoring for 13 Wrocław streets
- ✅ Push notifications for traffic changes
- ✅ Traffic predictions based on historical data
- ✅ Community features (chat, incidents, voting)
- ✅ Coupon system for local businesses
- ✅ Mobile-responsive web app
- ✅ Anonymous usage (no required login)

### What We Don't Do

- ❌ Navigation/routing (not Google Maps replacement)
- ❌ All streets in Wrocław (only 13 major streets)
- ❌ Other cities (Wrocław only)
- ❌ Public transport tracking
- ❌ Parking availability
- ❌ Automatic traffic detection (relies on user reports)
- ❌ Mobile native apps (web only)

## User Journey Examples

### Journey 1: First-Time User Reporting Traffic

1. User opens app (no account needed)
2. Selects street from dropdown (e.g., "Borowska")
3. Selects direction ("do centrum")
4. Sees current traffic prediction
5. Clicks "Stoi" button to report heavy traffic
6. Sees success toast: "Zgłoszenie wysłane!"
7. Other users receive push notification

### Journey 2: Subscribing to Push Notifications

1. User navigates to `/push` page
2. Clicks "Włącz powiadomienia"
3. Browser prompts for permission → User accepts
4. Selects street "Grabiszyńska"
5. Clicks "Subskrybuj"
6. Tag `street_grabiszynska` added to OneSignal
7. User receives test notification
8. From now on, gets alerts when traffic changes

### Journey 3: Planning Departure with GreenWave

1. User opens app at 7:00 AM
2. Selects "Borowska" + "do centrum"
3. Scrolls to GreenWave section
4. Sees green block at 7:30 AM (best time to leave)
5. Waits until 7:30 to depart
6. Avoids heavy traffic

## Data Flow Philosophy

### Real-Time Over Batch

```
User action → Immediate DB write → Push notification → Other users notified
(Latency: ~2 seconds)
```

### Historical Analysis Over Live Sensors

- No traffic cameras or sensors
- Use 4 weeks of user reports
- Filter by day-of-week for accuracy
- Majority vote for each time interval

### Anonymous But Trackable

- No user accounts required
- `user_fingerprint` for rate limiting
- LocalStorage for preferences
- OneSignal manages push subscriptions

## Development Philosophy

### Speed Over Perfection

- Relaxed TypeScript (no strict mode)
- Rapid prototyping with shadcn-ui
- Copy-paste components when needed
- Fix bugs as they appear (not preventively)

### Mobile-First Design

- Most users on mobile (commuters)
- Touch-friendly buttons
- Responsive timelines
- Fixed header with street selection

### Polish Language Priority

- All UI text in Polish
- English for code/docs optional
- Route names in Polish (`/o-projekcie`, not `/about`)

### AI-Assisted Development

- Part of 10xdevs 2.0 course
- Documentation created with AI collaboration
- Claude Code for implementation
- Test plans from video recordings (10x Test Planner)

## Project Metrics

### Success Criteria

1. **Usage:**
   - 100+ daily active users
   - 500+ traffic reports per day
   - 50+ push notification subscribers

2. **Performance:**
   - Page load < 3 seconds
   - Report submission < 2 seconds
   - 95% prediction accuracy (within 10 min)

3. **Engagement:**
   - 20+ chat messages per day
   - 10+ incident reports per week
   - 50% user retention (return within 7 days)

### Current Status

- **Phase:** Beta / Learning Project
- **Users:** Small community
- **Coverage:** 13 streets in Wrocław
- **Data:** 4+ weeks of historical traffic reports
- **Infrastructure:** Supabase (PostgreSQL + Edge Functions)

## Technical Debt & Known Issues

### Acknowledged Trade-offs

1. **No Tests Yet**
   - Unit tests: Planned (Vitest)
   - E2E tests: Planned (Playwright + 10x Test Planner)
   - CI runs disabled until tests written

2. **Relaxed TypeScript**
   - Allows `any` types
   - Nullable without checks
   - Trade-off: Speed vs safety

3. **OneSignal Android Display**
   - Shows as "Linux armv8l" in dashboard
   - This is expected behavior (not a bug)

4. **Manual Traffic Reports Only**
   - No automated sensors
   - Relies on user participation
   - Could miss low-traffic periods

5. **Limited to 13 Streets**
   - Hardcoded street list
   - Adding more requires code change
   - Not scalable to all Wrocław streets

## Learning Goals (10xdevs 2.0 Course)

This project demonstrates:

1. **AI-Powered Documentation**
   - All `10devs/*.md` files created with AI
   - Architecture diagrams from text descriptions
   - PRD, tech stack, CI/CD plans

2. **Claude Code Integration**
   - CLAUDE.md for AI assistant guidance
   - .claude/ folder for context
   - MCP server integration (10x Rules)

3. **Modern CI/CD**
   - GitHub Actions workflow
   - Non-blocking code analysis
   - Automated builds and artifact uploads

4. **AI-Powered Testing**
   - 10x Test Planner for E2E test generation
   - Video recordings → Test plans
   - Gemini AI for test case creation

5. **Serverless Architecture**
   - Supabase Edge Functions (Deno)
   - No backend server to maintain
   - PostgreSQL for data persistence

## Directory Structure Explained

```
stop-watch-polish/
├── src/                   # Frontend source code
│   ├── components/        # React components
│   │   ├── ui/           # shadcn-ui components (Radix + Tailwind)
│   │   └── *.tsx         # Feature components
│   ├── pages/            # Route pages (Index, Push, Statystyki, etc.)
│   ├── integrations/     # External service integrations
│   │   └── supabase/     # Supabase client and types
│   ├── utils/            # Utility functions
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Library configurations
├── supabase/             # Backend code
│   ├── functions/        # Edge Functions (Deno)
│   └── migrations/       # Database migrations (SQL)
├── public/               # Static assets
│   ├── OneSignalSDKWorker.js  # Service worker for push
│   └── *.png, *.ico      # Images and icons
├── .github/workflows/    # GitHub Actions CI/CD
├── .claude/              # Claude Code configuration
│   ├── architecture.md   # Project architecture
│   ├── rules.md          # Coding standards
│   ├── use-cases.md      # Development scenarios
│   ├── context/          # Project context
│   └── commands/         # Custom slash commands
├── 10devs/               # Project documentation
│   ├── PRD.md            # Product requirements
│   ├── ARCHITECTURE_AND_TESTING.md
│   ├── TECHNOLOGY.md     # Tech stack details
│   └── GITHUBACTIONS-PLAN.md
├── CLAUDE.md             # AI assistant instructions
└── README.md             # Project overview
```

## Environment Setup

### Required Accounts

1. **Supabase** (https://supabase.com)
   - Project URL
   - Anon/public key

2. **OneSignal** (https://onesignal.com)
   - App ID
   - Web Push Certificate

3. **Google Cloud** (Optional)
   - For Google Routes API (traffic data)
   - API key with Routes API enabled

### Local Development

```bash
# Clone repo
git clone <repo-url>
cd stop-watch-polish

# Install dependencies
npm i

# Setup environment
cp .env.example .env
# Edit .env with Supabase credentials

# Start dev server
npm run dev
# Opens on http://[::]:8080

# Start local Supabase (optional)
npx supabase start
```

### Deployment

**Frontend:** Lovable.dev (auto-deploy on push)
**Backend:** Supabase (Edge Functions deployed separately)
**CI/CD:** GitHub Actions (lint, type-check, build)

## Future Roadmap

### Q1 2026
- Implement comprehensive test suite (Vitest + Playwright)
- Add more streets (expand to 20+)
- Improve prediction algorithms (weather integration)

### Q2 2026
- Mobile native apps (React Native or Flutter)
- User accounts (optional, for personalization)
- Traffic heatmaps

### Q3 2026
- Integration with city traffic systems
- Automated traffic detection (cameras/sensors)
- API for third-party integrations

### Q4 2026
- Expand to other Polish cities
- Multi-language support
- Premium features for businesses

## Key Contacts

- **Project Owner:** Grzegorz Malopolski
- **Email:** grzegorz.malopolski@ringieraxelspringer.pl
- **Course:** 10xdevs 2.0 (https://www.10xdevs.pl/)
- **Project URL:** https://lovable.dev/projects/7e6d938d-cb5d-485a-93c6-06ffdfa54334

## Documentation Index

### For Developers
- **Quick Start:** README.md
- **Architecture:** .claude/architecture.md
- **Coding Rules:** .claude/rules.md
- **Use Cases:** .claude/use-cases.md
- **Tech Stack:** 10devs/TECHNOLOGY.md

### For AI Assistants
- **Main Guide:** CLAUDE.md
- **Project Context:** .claude/context/project.md
- **Custom Commands:** .claude/commands/ (if any)

### For Product/Business
- **PRD:** 10devs/PRD.md
- **Architecture:** 10devs/ARCHITECTURE_AND_TESTING.md
- **CI/CD:** 10devs/GITHUBACTIONS-PLAN.md

## Common Questions

### Why no user accounts?
- Lower barrier to entry (no signup friction)
- Privacy-first approach
- Faster development

### Why only 13 streets?
- Focus on major traffic corridors
- Manageable for MVP
- Quality over quantity

### Why Polish language only?
- Target audience is Wrocław residents
- All speak Polish
- Simplifies localization

### Why Supabase over custom backend?
- Faster development
- No server maintenance
- Built-in features (auth, storage, realtime)
- Learning opportunity (serverless architecture)

### Why OneSignal over Firebase?
- Easier web push integration
- Better tag-based segmentation
- Already familiar from course

### When will tests be added?
- Currently in planning phase
- Will use Vitest for unit tests
- Playwright + 10x Test Planner for E2E tests
- Target: Q1 2026

---

**Last Updated:** December 12, 2025
**Version:** 1.0.0
**Status:** Active Development / Learning Project
