# Technology Stack

## Complete technical specification of frameworks, libraries, languages, and tools used in "Czy ulica stoi?"

**Last Updated:** December 12, 2025
**Project Owner:** Grzegorz Malopolski

---

## Table of Contents

1. [Languages](#1-languages)
2. [Frontend Framework & Core](#2-frontend-framework--core)
3. [UI Framework & Styling](#3-ui-framework--styling)
4. [State Management](#4-state-management)
5. [Backend & Database](#5-backend--database)
6. [External Integrations](#6-external-integrations)
7. [Build Tools & Development](#7-build-tools--development)
8. [Testing (Recommended)](#8-testing-recommended)
9. [Deployment & Hosting](#9-deployment--hosting)
10. [Version Requirements](#10-version-requirements)
11. [Why These Technologies?](#11-why-these-technologies)

---

## 1. Languages

### 1.1 TypeScript
**Version:** 5.8.3
**Usage:** Primary language for frontend application

**Description:**
- Strongly-typed JavaScript superset
- Provides compile-time type checking
- Enhances IDE autocomplete and refactoring
- Catches errors before runtime

**Configuration:**
- `tsconfig.json` - Base configuration
- `tsconfig.app.json` - Application-specific config
- `tsconfig.node.json` - Build tools config

**Settings:**
```json
{
  "noImplicitAny": false,        // Relaxed for rapid development
  "strictNullChecks": false,      // Relaxed for convenience
  "allowJs": true,                // Allow JavaScript files
  "esModuleInterop": true
}
```

**Key Features Used:**
- Interface definitions for database types
- Type inference for React components
- Generic types for reusable utilities
- Union types for status enums

---

### 1.2 JavaScript (ES6+)
**Usage:** Service workers, build configuration

**Files:**
- `/public/OneSignalSDKWorker.js` - Push notification service worker
- `eslint.config.js` - Linting configuration
- `postcss.config.js` - PostCSS configuration
- `tailwind.config.ts` - Tailwind configuration (can be JS or TS)

**Features Used:**
- Async/await for asynchronous operations
- Arrow functions
- Destructuring
- Template literals
- Modules (import/export)

---

### 1.3 SQL (PostgreSQL)
**Version:** PostgreSQL 15+ (via Supabase)
**Usage:** Database queries, migrations

**Locations:**
- `supabase/migrations/` - Database schema migrations
- Inline queries in Edge Functions
- Supabase client queries in frontend

**Features Used:**
- Relational database design
- Indexes for performance
- Triggers for automation
- Row-level security (RLS) policies
- Timestamptz for UTC timestamps

---

### 1.4 Deno/TypeScript
**Version:** Deno 1.x
**Usage:** Supabase Edge Functions (serverless backend)

**Description:**
- Secure TypeScript runtime by default
- No package.json, uses URL imports
- Built-in TypeScript compiler
- Sandbox execution environment

**Example:**
```typescript
// supabase/functions/submit-traffic-report/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from '@supabase/supabase-js'
```

---

## 2. Frontend Framework & Core

### 2.1 React
**Version:** 18.3.1
**Website:** https://react.dev

**Description:**
- Component-based UI library
- Virtual DOM for efficient updates
- Hooks for state management
- Declarative programming model

**Key Features Used:**
- **Functional Components:** All components use function syntax
- **Hooks:**
  - `useState` - Local component state
  - `useEffect` - Side effects and lifecycle
  - `useMemo` - Performance optimization
  - `useRef` - DOM references and mutable values
  - `useCallback` - Memoized callbacks
- **Context API:** Minimal use (theme only)
- **Concurrent Features:** Automatic batching in React 18

**Example:**
```tsx
import { useState, useEffect } from 'react';

export const TrafficButton = () => {
  const [status, setStatus] = useState('neutral');

  useEffect(() => {
    // Fetch latest traffic status
  }, []);

  return <button onClick={() => setStatus('stoi')}>Stoi</button>;
};
```

---

### 2.2 React DOM
**Version:** 18.3.1

**Description:**
- React's rendering layer for web browsers
- Handles DOM updates and reconciliation

**Usage:**
```tsx
// src/main.tsx
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

---

### 2.3 Vite
**Version:** 5.4.19
**Website:** https://vitejs.dev

**Description:**
- Next-generation frontend build tool
- Lightning-fast Hot Module Replacement (HMR)
- Optimized production builds with Rollup
- Native ES modules in development

**Configuration:** `vite.config.ts`
```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")  // Path alias
    }
  }
})
```

**Features Used:**
- **Dev Server:** Instant server start, fast HMR
- **Build:** Optimized production bundles
- **Plugin:** `@vitejs/plugin-react-swc` (SWC compiler for faster builds)
- **Path Alias:** `@/` maps to `./src/`

**Commands:**
```bash
npm run dev        # Dev server on http://[::]:8080
npm run build      # Production build
npm run preview    # Preview production build
```

---

## 3. UI Framework & Styling

### 3.1 shadcn-ui
**Website:** https://ui.shadcn.com

**Description:**
- Collection of reusable components built on Radix UI
- Copy-paste components (not an npm package)
- Full customization control
- Accessible by default (WCAG AA compliant)

**Location:** `src/components/ui/`

**Components Used:**
- Button, Card, Dialog, Dropdown Menu
- Select, Tabs, Toast, Tooltip
- Alert Dialog, Popover, Progress
- Input, Label, Slider, Switch
- Accordion, Avatar, Checkbox
- and more...

**Example:**
```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

<Card>
  <CardContent>
    <Button variant="destructive">Stoi</Button>
  </CardContent>
</Card>
```

---

### 3.2 Radix UI
**Versions:** Multiple packages (^1.x - ^2.x)
**Website:** https://www.radix-ui.com

**Description:**
- Unstyled, accessible component primitives
- Foundation for shadcn-ui components
- WAI-ARIA compliant
- Keyboard navigation built-in

**Packages Used:**
```json
{
  "@radix-ui/react-accordion": "^1.2.11",
  "@radix-ui/react-alert-dialog": "^1.1.14",
  "@radix-ui/react-dialog": "^1.1.14",
  "@radix-ui/react-dropdown-menu": "^2.1.15",
  "@radix-ui/react-popover": "^1.1.14",
  "@radix-ui/react-select": "^2.2.5",
  "@radix-ui/react-tabs": "^1.1.12",
  "@radix-ui/react-toast": "^1.2.14",
  // ... and many more
}
```

---

### 3.3 Tailwind CSS
**Version:** 3.4.17
**Website:** https://tailwindcss.com

**Description:**
- Utility-first CSS framework
- No custom CSS needed
- Responsive design built-in
- JIT (Just-In-Time) compiler

**Configuration:** `tailwind.config.ts`
```typescript
{
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'traffic-stoi': '#ef4444',      // Red
        'traffic-toczy': '#f59e0b',     // Orange
        'traffic-jedzie': '#10b981',    // Green
        'traffic-neutral': '#6b7280',   // Grey
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate')
  ]
}
```

**Utility Classes Used:**
```tsx
<div className="flex items-center justify-between px-4 py-2 bg-traffic-stoi text-white rounded-lg shadow-md">
  Traffic Stopped
</div>
```

---

### 3.4 Tailwind CSS Plugins

#### tailwindcss-animate
**Version:** 1.0.7
**Description:** Adds animation utilities (fade, slide, etc.)

**Usage:**
```tsx
<div className="animate-in fade-in slide-in-from-top">
  Notification
</div>
```

#### @tailwindcss/typography
**Version:** 0.5.16
**Description:** Beautiful typographic defaults for Markdown content

**Usage:**
```tsx
<article className="prose prose-slate">
  {markdownContent}
</article>
```

---

### 3.5 Styling Utilities

#### clsx
**Version:** 2.1.1
**Description:** Utility for constructing className strings conditionally

```tsx
import clsx from 'clsx';

const buttonClass = clsx(
  'px-4 py-2 rounded',
  isActive && 'bg-blue-500',
  isDisabled && 'opacity-50 cursor-not-allowed'
);
```

#### tailwind-merge
**Version:** 2.6.0
**Description:** Merge Tailwind classes without conflicts

```tsx
import { cn } from '@/lib/utils';  // cn = clsx + twMerge

<Button className={cn('bg-red-500', props.className)} />
// Props className will override bg-red-500 if it includes bg-*
```

---

### 3.6 Icons

#### lucide-react
**Version:** 0.462.0
**Website:** https://lucide.dev

**Description:**
- Clean, consistent icon library
- Tree-shakeable (only imports used icons)
- Customizable size, color, stroke width

**Usage:**
```tsx
import { MapPin, Clock, AlertCircle } from 'lucide-react';

<AlertCircle className="h-4 w-4 text-red-500" />
```

**Icons Used:**
- Navigation: MapPin, Navigation, Route
- Status: AlertCircle, CheckCircle, Clock
- UI: Menu, X, ChevronDown, Bell
- And 50+ more

---

## 4. State Management

### 4.1 TanStack Query (React Query)
**Version:** 5.83.0
**Website:** https://tanstack.com/query

**Description:**
- Powerful data fetching and caching library
- Automatic background refetching
- Optimistic updates
- Cache management

**Key Features:**
- **Queries:** Fetch and cache server data
- **Mutations:** Create, update, delete operations
- **Cache Invalidation:** Automatic or manual
- **Stale-While-Revalidate:** Show cached data while fetching fresh

**Setup:**
```tsx
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
    },
  },
});

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

**Usage Example:**
```tsx
import { useQuery, useMutation } from '@tanstack/react-query';

// Fetch traffic reports
const { data: reports, isLoading } = useQuery({
  queryKey: ['traffic', street, direction],
  queryFn: () => fetchTrafficReports(street, direction)
});

// Submit traffic report
const mutation = useMutation({
  mutationFn: submitTrafficReport,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['traffic'] });
  }
});
```

---

### 4.2 React Router DOM
**Version:** 6.30.1
**Website:** https://reactrouter.com

**Description:**
- Declarative routing for React
- Client-side navigation
- Nested routes support
- Route parameters and query strings

**Routes:**
```tsx
// src/App.tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/push" element={<Push />} />
    <Route path="/statystyki" element={<Statystyki />} />
    <Route path="/kupon" element={<Kupon />} />
    <Route path="/coupons" element={<Coupons />} />
    <Route path="/konto" element={<Konto />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/o-projekcie" element={<About />} />
    <Route path="/kontakt" element={<Contact />} />
    <Route path="/regulamin" element={<TermsAndPrivacy />} />
    <Route path="/rss" element={<Rss />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
</BrowserRouter>
```

**Navigation:**
```tsx
import { useNavigate, Link } from 'react-router-dom';

const navigate = useNavigate();
navigate('/push');

<Link to="/statystyki">Statystyki</Link>
```

---

### 4.3 Local Storage
**Native Browser API**

**Usage:**
- Selected street preference
- Push notification subscriptions
- User preferences

**Example:**
```typescript
// Save subscription
localStorage.setItem('subscriptions', JSON.stringify({
  Borowska: true
}));

// Load subscription
const subscriptions = JSON.parse(
  localStorage.getItem('subscriptions') || '{}'
);
```

---

## 5. Backend & Database

### 5.1 Supabase
**Version:** @supabase/supabase-js ^2.76.1
**Website:** https://supabase.com

**Description:**
- Open-source Firebase alternative
- PostgreSQL database
- Real-time subscriptions
- Authentication
- Storage
- Edge Functions (serverless)

**Services Used:**

#### Database (PostgreSQL)
- Primary data store
- Real-time subscriptions via WebSocket
- Row-Level Security (RLS)
- Triggers and functions

**Tables:**
- `traffic_reports` - Traffic status submissions
- `coupons` - Discount coupons
- `locations` - Business locations
- `chat_messages` - Street chat
- `users` - User accounts
- And more...

#### Supabase Auth
- Email/password authentication
- OAuth providers (Google, GitHub, etc.)
- Session management
- User metadata

#### Supabase Storage
- File storage for coupon images
- CDN delivery
- Access control policies

#### Supabase Edge Functions
- Serverless functions (Deno runtime)
- CORS-enabled
- Automatic deployment from `/supabase/functions/`

**Client Setup:**
```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);
```

**Query Example:**
```typescript
// Fetch traffic reports
const { data, error } = await supabase
  .from('traffic_reports')
  .select('*')
  .eq('street', 'Borowska')
  .eq('direction', 'do centrum')
  .gte('reported_at', startDate)
  .order('reported_at', { ascending: false });
```

---

### 5.2 PostgreSQL
**Version:** 15+ (managed by Supabase)

**Features Used:**
- **Data Types:** UUID, TIMESTAMPTZ, TEXT, INTEGER, JSONB
- **Indexes:** B-tree indexes on frequently queried columns
- **Functions:** Custom SQL functions for complex queries
- **Triggers:** Automatic timestamp updates
- **RLS Policies:** Row-level security for data access control

**Schema Management:**
- Migrations stored in `supabase/migrations/`
- Version-controlled schema changes
- Rollback capabilities

---

## 6. External Integrations

### 6.1 OneSignal Web SDK
**Version:** 16.x (latest)
**Website:** https://onesignal.com

**Description:**
- Push notification service
- Web push (browser notifications)
- Service worker-based
- Tag-based segmentation

**Integration:**
- Initialized in `index.html` (lines 40-168)
- Service worker: `/public/OneSignalSDKWorker.js`
- Helper functions: `src/utils/onesignal.ts`

**Features Used:**
- **Web Push:** Desktop and mobile browser notifications
- **Tags:** User segmentation (`street_<streetname>`)
- **Custom Notification Handling:** Foreground notifications
- **REST API:** Sending notifications from Edge Functions

**Initialization:**
```html
<!-- index.html -->
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: "YOUR_APP_ID",
      serviceWorkerParam: { scope: '/' },
      notifyButton: { enable: false }
    });
  });
</script>
```

**Tag Management:**
```typescript
// Subscribe to street
await OneSignal.User.addTag("street_borowska", "1");

// Unsubscribe
await OneSignal.User.removeTag("street_borowska");

// Check tags
const tags = await OneSignal.User.getTags();
```

---

### 6.2 Google Routes API
**Version:** Latest
**Website:** https://developers.google.com/maps/documentation/routes

**Description:**
- Real-time traffic data
- Route duration with traffic
- Distance calculations

**Usage:**
- Fetched via `get-traffic-data` Edge Function
- Provides `duration_in_traffic` and `distance`
- Speed calculated: `(distance/1000) / (duration/3600)` = km/h

**Integration:**
```typescript
// Edge Function calls Google Routes API
const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
  method: 'POST',
  headers: {
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs.duration,routes.legs.distanceMeters'
  },
  body: JSON.stringify({
    origin: { location: { latLng: { latitude, longitude } } },
    destination: { location: { latLng: { latitude, longitude } } },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE'
  })
});
```

---

### 6.3 Weather API
**Description:**
- 7-day weather forecast
- Current conditions
- Integration for traffic correlation

**Usage:**
- Fetched via `get-weather-forecast` Edge Function
- Displayed in `WeatherForecast.tsx` component
- Could be OpenWeather, WeatherAPI, or similar

---

## 7. Build Tools & Development

### 7.1 TypeScript Compiler
**Version:** 5.8.3

**Configuration Files:**
- `tsconfig.json` - Base configuration
- `tsconfig.app.json` - App-specific settings
- `tsconfig.node.json` - Build tools settings

---

### 7.2 ESLint
**Version:** 9.32.0
**Configuration:** `eslint.config.js`

**Plugins:**
- `eslint-plugin-react-hooks` (^5.2.0) - React Hooks linting
- `eslint-plugin-react-refresh` (^0.4.20) - Fast Refresh validation

**Purpose:**
- Code quality checks
- Catch common bugs
- Enforce coding standards

**Command:**
```bash
npm run lint
```

---

### 7.3 PostCSS
**Version:** 8.5.6
**Configuration:** `postcss.config.js`

**Plugins:**
- `tailwindcss` - Process Tailwind directives
- `autoprefixer` - Add vendor prefixes automatically

---

### 7.4 Autoprefixer
**Version:** 10.4.21

**Description:**
- Automatically adds browser vendor prefixes
- Uses Can I Use database
- Ensures cross-browser compatibility

---

## 8. Testing (Recommended)

⚠️ **Note:** Tests not currently implemented. These are recommendations.

### 8.1 Vitest (Recommended)
**Recommended Version:** Latest
**Website:** https://vitest.dev

**Description:**
- Vite-native test framework
- Compatible with Jest APIs
- Fast execution with Vite transforms
- Built-in TypeScript support

**Installation:**
```bash
npm install -D vitest @vitest/ui
```

**Configuration:** `vitest.config.ts`

---

### 8.2 React Testing Library (Recommended)
**Recommended Packages:**
```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Description:**
- Test React components
- User-centric testing approach
- Query by accessible roles/labels

---

### 8.3 Playwright (Recommended)
**Recommended Version:** Latest
**Website:** https://playwright.dev

**Description:**
- End-to-end testing
- Multi-browser support (Chrome, Firefox, Safari)
- Auto-wait for elements
- Screenshots and videos

**Installation:**
```bash
npm install -D @playwright/test
```

---

## 9. Deployment & Hosting

### 9.1 Lovable
**Website:** https://lovable.dev

**Description:**
- No-code deployment platform
- Automatic builds from Git
- CDN distribution
- Custom domain support

**Integration:**
- Project URL: https://lovable.dev/projects/7e6d938d-cb5d-485a-93c6-06ffdfa54334
- Auto-deploy on Git push
- Vite production build
- Static file hosting

---

### 9.2 Supabase Platform
**Hosting:** Supabase Cloud
**Description:**
- PostgreSQL database hosting
- Edge Functions auto-deployment
- Global CDN for static assets
- Built-in monitoring and logs

---

## 10. Version Requirements

### Minimum Requirements

| Dependency | Minimum Version | Current Version |
|------------|----------------|-----------------|
| **Node.js** | 20.x | 20.x |
| **npm** | 9.x | Latest |
| **TypeScript** | 5.0 | 5.8.3 |
| **React** | 18.0 | 18.3.1 |
| **Vite** | 5.0 | 5.4.19 |

### Browser Support

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| **Chrome** | 100+ | Full support |
| **Safari** | 15+ | Full support |
| **Firefox** | 100+ | Full support |
| **Edge** | 100+ | Full support |
| **IE 11** | ❌ Not supported | No push notifications |

### Mobile Browsers

| Platform | Browser | Support |
|----------|---------|---------|
| **Android** | Chrome 100+ | ✅ Full support |
| **iOS** | Safari 15+ | ✅ Full support |
| **Android** | Firefox | ✅ Supported |

---

## 11. Why These Technologies?

### 11.1 React + TypeScript
**Benefits:**
- ✅ Type safety reduces runtime errors
- ✅ Excellent IDE support (autocomplete, refactoring)
- ✅ Large ecosystem and community
- ✅ Easy to find developers

**Trade-offs:**
- ⚠️ Learning curve for TypeScript
- ⚠️ Bundle size larger than plain JS

---

### 11.2 Vite
**Benefits:**
- ✅ Instant server start (no bundling in dev)
- ✅ Lightning-fast HMR (<50ms)
- ✅ Optimized production builds
- ✅ Modern browser features (ESM)

**Why not Webpack/Create React App?**
- Vite is 10-100x faster in development
- CRA is deprecated, Vite is actively maintained

---

### 11.3 Tailwind CSS
**Benefits:**
- ✅ Rapid UI development
- ✅ No CSS files to manage
- ✅ Consistent design system
- ✅ Smaller bundle (unused classes purged)
- ✅ Responsive design utilities

**Trade-offs:**
- ⚠️ Verbose className attributes
- ⚠️ Learning curve for utility classes

**Why not Bootstrap/Material-UI?**
- More customization control
- Smaller bundle size
- Better performance

---

### 11.4 shadcn-ui + Radix UI
**Benefits:**
- ✅ Accessible by default (WCAG AA)
- ✅ Full control (copy-paste, not dependency)
- ✅ Unstyled primitives (Radix)
- ✅ Beautiful defaults (shadcn)

**Why not Material-UI/Ant Design?**
- Lighter weight
- More customization freedom
- Better accessibility

---

### 11.5 React Query
**Benefits:**
- ✅ Automatic caching and refetching
- ✅ Optimistic updates
- ✅ Less boilerplate than Redux
- ✅ Built-in loading/error states

**Why not Redux/Zustand?**
- Designed for server state (perfect fit)
- Handles caching automatically
- Simpler API

---

### 11.6 Supabase
**Benefits:**
- ✅ PostgreSQL (powerful, scalable)
- ✅ Real-time subscriptions
- ✅ Authentication built-in
- ✅ Edge Functions (serverless)
- ✅ Open source (no vendor lock-in)

**Why not Firebase?**
- PostgreSQL > NoSQL for relational data
- Better SQL query capabilities
- Open source alternative

**Why not custom backend?**
- Faster development
- Less infrastructure management
- Built-in features (auth, storage, functions)

---

### 11.7 OneSignal
**Benefits:**
- ✅ Free tier (10,000 subscribers)
- ✅ Easy integration
- ✅ Tag-based segmentation
- ✅ REST API for server-side sending

**Why not Firebase Cloud Messaging?**
- OneSignal has better web push UX
- Easier tag management
- More generous free tier

---

## 12. Utility Libraries

### 12.1 Date Handling

#### date-fns
**Version:** 3.6.0
**Website:** https://date-fns.org

**Description:**
- Modern JavaScript date utility library
- Tree-shakeable (import only what you need)
- Immutable functions

**Functions Used:**
```typescript
import { addDays, subDays, startOfDay, addMinutes, parseISO } from 'date-fns';

const weekStart = startOfDay(subDays(now, 6));
const nextWeek = addDays(now, 7);
const parsed = parseISO('2025-12-12T10:00:00Z');
```

**Why not Moment.js?**
- Smaller bundle size
- Tree-shakeable
- Immutable (no mutation bugs)
- Actively maintained

---

### 12.2 Form Handling

#### react-hook-form
**Version:** 7.61.1
**Website:** https://react-hook-form.com

**Description:**
- Performant form library
- Minimal re-renders
- Built-in validation

**Usage:**
```tsx
import { useForm } from 'react-hook-form';

const { register, handleSubmit, formState: { errors } } = useForm();

<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register('street', { required: true })} />
  {errors.street && <span>Street is required</span>}
</form>
```

---

### 12.3 Validation

#### zod
**Version:** 3.25.76
**Website:** https://zod.dev

**Description:**
- TypeScript-first schema validation
- Infer TypeScript types from schemas
- Runtime validation

**Usage:**
```typescript
import { z } from 'zod';

const trafficReportSchema = z.object({
  street: z.string().min(1),
  status: z.enum(['stoi', 'toczy_sie', 'jedzie']),
  direction: z.enum(['do centrum', 'od centrum']),
  speed: z.number().optional()
});

type TrafficReport = z.infer<typeof trafficReportSchema>;
```

**Integration with react-hook-form:**
```typescript
import { zodResolver } from '@hookform/resolvers/zod';

const { register } = useForm({
  resolver: zodResolver(trafficReportSchema)
});
```

---

### 12.4 Charts & Visualization

#### recharts
**Version:** 2.15.4
**Website:** https://recharts.org

**Description:**
- React chart library
- Declarative API
- Responsive charts

**Usage:**
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

<LineChart data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="time" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="speed" stroke="#8884d8" />
</LineChart>
```

---

### 12.5 Notifications

#### sonner
**Version:** 1.7.4
**Website:** https://sonner.emilkowal.ski

**Description:**
- Beautiful toast notifications
- Stacking and queuing
- Accessible (ARIA)

**Usage:**
```tsx
import { toast } from 'sonner';

toast.success('Zgłoszenie wysłane!');
toast.error('Błąd podczas wysyłania');
toast.loading('Wysyłanie...');
```

---

### 12.6 QR Code Scanning

#### @zxing/browser
**Version:** 0.1.5
**Website:** https://github.com/zxing-js/browser

**Description:**
- Browser-based QR code reader
- Camera access via getUserMedia
- Supports multiple barcode formats

**Usage:**
```typescript
import { BrowserQRCodeReader } from '@zxing/browser';

const reader = new BrowserQRCodeReader();
await reader.decodeFromVideoDevice(
  undefined,  // Use default camera
  videoElement,
  (result) => {
    console.log('QR Code:', result.getText());
  }
);
```

**⚠️ Important:** Use `BrowserQRCodeReader`, NOT `BrowserMultiFormatReader`

---

### 12.7 Screenshot Capture

#### html2canvas
**Version:** 1.4.1
**Website:** https://html2canvas.hertzen.com

**Description:**
- Screenshot HTML elements
- Export to PNG/JPG
- Used for sharing traffic reports

**Usage:**
```typescript
import html2canvas from 'html2canvas';

const element = document.getElementById('traffic-report');
const canvas = await html2canvas(element);
const image = canvas.toDataURL('image/png');
```

---

### 12.8 UI Components (Additional)

#### vaul
**Version:** 0.9.9
**Description:** Drawer component for mobile

#### embla-carousel-react
**Version:** 8.6.0
**Description:** Carousel/slider component

#### react-day-picker
**Version:** 8.10.1
**Description:** Date picker component

#### input-otp
**Version:** 1.4.2
**Description:** OTP input component

#### next-themes
**Version:** 0.3.0
**Description:** Theme management (dark mode)

#### cmdk
**Version:** 1.1.1
**Description:** Command menu (⌘K style)

#### react-resizable-panels
**Version:** 2.1.9
**Description:** Resizable panel layouts

---

## 13. Development Dependencies

### 13.1 Type Definitions

```json
{
  "@types/node": "^22.16.5",
  "@types/react": "^18.3.23",
  "@types/react-dom": "^18.3.7"
}
```

**Purpose:** TypeScript type definitions for Node.js and React

---

### 13.2 Lovable Tools

#### lovable-tagger
**Version:** 1.11.11
**Description:** Internal Lovable tooling for project tagging

---

## 14. Environment Variables

### Required Variables

Create `.env` file in project root:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Optional (for development)
VITE_ONESIGNAL_APP_ID=your-onesignal-app-id
VITE_GOOGLE_ROUTES_API_KEY=your-google-api-key
```

**⚠️ Important:** All environment variables must be prefixed with `VITE_` to be accessible in the frontend.

**Access in code:**
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
```

---

## 15. Package Management

### 15.1 npm
**Lock File:** `package-lock.json`

**Commands:**
```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

---

### 15.2 Alternative: Bun (Optional)
**Lock File:** `bun.lockb` (exists in project)

**Description:**
- Faster alternative to npm
- Compatible with npm packages
- Optional, not required

**Commands:**
```bash
bun install
bun run dev
bun run build
```

---

## 16. Code Quality Tools

### 16.1 Class Variance Authority
**Version:** 0.7.1
**Package:** `class-variance-authority`

**Description:**
- Create variant-based component APIs
- Type-safe prop variants

**Usage:**
```typescript
import { cva } from 'class-variance-authority';

const button = cva('px-4 py-2 rounded', {
  variants: {
    intent: {
      primary: 'bg-blue-500 text-white',
      secondary: 'bg-gray-500 text-white'
    },
    size: {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg'
    }
  },
  defaultVariants: {
    intent: 'primary',
    size: 'medium'
  }
});

<button className={button({ intent: 'secondary', size: 'large' })} />
```

---

## 17. Technology Decision Matrix

| Decision | Options Considered | Chosen | Reason |
|----------|-------------------|--------|--------|
| **Frontend Framework** | React, Vue, Svelte | **React** | Largest ecosystem, team familiarity |
| **Type System** | TypeScript, Flow, None | **TypeScript** | Industry standard, best tooling |
| **Build Tool** | Webpack, Vite, Parcel | **Vite** | Fastest dev experience |
| **Styling** | CSS Modules, Styled Components, Tailwind | **Tailwind** | Rapid development, small bundle |
| **UI Components** | Material-UI, Ant Design, shadcn-ui | **shadcn-ui** | Customizable, accessible |
| **State Management** | Redux, MobX, Zustand, React Query | **React Query** | Best for server state |
| **Backend** | Custom Node.js, Firebase, Supabase | **Supabase** | PostgreSQL + fast setup |
| **Push Notifications** | FCM, OneSignal, Pusher | **OneSignal** | Easy web push, free tier |
| **Testing** | Jest, Vitest, Testing Library | **Vitest** (planned) | Vite-native, fast |
| **Deployment** | Vercel, Netlify, Lovable | **Lovable** | Integrated with design tool |

---

## 18. Performance Optimizations

### Implemented

1. **Code Splitting:**
   - Automatic route-based splitting via React Router
   - Lazy loading of heavy components

2. **Tree Shaking:**
   - Vite removes unused code
   - Import only needed functions (date-fns, lucide-react)

3. **CSS Purging:**
   - Tailwind removes unused CSS classes
   - Production CSS typically <50KB

4. **Image Optimization:**
   - WebP format where possible
   - Lazy loading images

5. **Caching:**
   - React Query caches API responses (5-minute stale time)
   - Service worker caches static assets

### Recommended Improvements

- [ ] Implement virtual scrolling for long lists
- [ ] Add image lazy loading library
- [ ] Use React.memo() for expensive components
- [ ] Implement progressive web app (PWA) features
- [ ] Add service worker for offline support

---

## 19. Security Considerations

### Current Security Features

1. **HTTPS Only:** All traffic encrypted
2. **CORS Configuration:** Whitelist-only in Edge Functions
3. **SQL Injection Prevention:** Parameterized queries via Supabase
4. **XSS Protection:** React automatically escapes content
5. **Row-Level Security:** Database-level access control
6. **Environment Variables:** Sensitive keys not in code

### Security Headers (Recommended)

Add to hosting configuration:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' cdn.onesignal.com
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 20. License Information

### Open Source Dependencies

All major dependencies are open source:
- **React:** MIT License
- **Vite:** MIT License
- **Tailwind CSS:** MIT License
- **Supabase:** Apache 2.0
- **shadcn-ui:** MIT License
- **Radix UI:** MIT License

### Project License

Check `LICENSE` file in repository root (if exists).

---

## 21. Additional Resources

### Official Documentation

- **React:** https://react.dev
- **TypeScript:** https://www.typescriptlang.org/docs
- **Vite:** https://vitejs.dev/guide
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Supabase:** https://supabase.com/docs
- **React Query:** https://tanstack.com/query/latest/docs
- **OneSignal:** https://documentation.onesignal.com

### Community Resources

- **Stack Overflow:** For troubleshooting
- **GitHub Issues:** For bug reports
- **Discord/Slack:** Framework-specific communities

---

## 22. Technology Radar

### Adopt ✅
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Query
- Supabase

### Trial 🔶
- Bun (as npm alternative)
- Server Components (future React feature)
- Vitest (when implementing tests)

### Assess 🔍
- Turbopack (Webpack alternative)
- Fresh (Deno framework)
- Million.js (React performance)

### Hold ⏸️
- Webpack (use Vite instead)
- Create React App (deprecated)
- jQuery (outdated)
- Moment.js (use date-fns)

---

## Conclusion

This technology stack prioritizes:

1. **Developer Experience:** Fast builds, great tooling, type safety
2. **Performance:** Minimal bundle size, optimized rendering
3. **Maintainability:** Modern, well-documented technologies
4. **Scalability:** Can handle 10,000+ users without major changes
5. **Accessibility:** WCAG AA compliant components

The stack is **production-ready**, **well-supported**, and **future-proof** for the next 3-5 years.

---

**Last Updated:** December 12, 2025
**Maintained By:** Grzegorz Malopolski (grzegorz.malopolski@ringieraxelspringer.pl)
