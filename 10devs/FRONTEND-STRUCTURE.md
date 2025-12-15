# Frontend Structure - React + Vite + Tailwind + shadcn/ui

## Przegląd

Frontend projektu "Czy ulica stoi?" został zbudowany z:
- **React 18.3.1** - UI framework
- **TypeScript 5.8.3** - Type safety
- **Vite 5.4.19** - Build tool i dev server
- **Tailwind CSS 3.4.17** - Utility-first styling
- **shadcn/ui** - Component library (Radix UI + Tailwind)
- **React Query 5.83.0** - Server state management
- **React Router 6.30.1** - Client-side routing

## Struktura Katalogów

```
src/
├── components/              # Komponenty React
│   ├── ui/                 # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   └── toast.tsx
│   │
│   ├── TrafficLine.tsx           # Wizualna linia ruchu + Google Routes
│   ├── PredictedTraffic.tsx      # Predykcja na następną godzinę (5 min intervals)
│   ├── TodayTimeline.tsx         # Timeline dnia dzisiejszego (1 hr intervals)
│   ├── WeeklyTimeline.tsx        # Timeline tygodniowy (30 min intervals)
│   ├── GreenWave.tsx             # Optymalna godzina wyjazdu (10 min intervals)
│   ├── StreetChat.tsx            # Chat specyficzny dla ulicy
│   ├── StreetVoting.tsx          # Głosowanie na ulice
│   ├── IncidentReports.tsx       # Zgłoszenia incydentów
│   ├── CarpoolingVotes.tsx       # Głosowania carpooling
│   ├── PushNotificationButton.tsx # Subskrypcja OneSignal
│   └── QRCodeScanner.tsx         # Skaner QR kodów
│
├── pages/                   # Strony aplikacji (routing)
│   ├── Index.tsx            # Główna strona (/)
│   ├── Push.tsx             # Zarządzanie powiadomieniami (/push)
│   ├── Statystyki.tsx       # Statystyki ruchu (/statystyki)
│   ├── Kupon.tsx            # Realizacja kuponu (/kupon?id=...)
│   ├── Coupons.tsx          # Zarządzanie kuponami (/coupons)
│   ├── OProjekcie.tsx       # O projekcie (/o-projekcie)
│   ├── Kontakt.tsx          # Kontakt (/kontakt)
│   ├── Regulamin.tsx        # Regulamin (/regulamin)
│   └── RSS.tsx              # RSS feed (/rss)
│
├── integrations/            # Integracje zewnętrzne
│   └── supabase/
│       ├── client.ts        # Supabase client
│       └── types.ts         # Database types (auto-generated)
│
├── utils/                   # Funkcje utility
│   ├── onesignal.ts         # OneSignal helpers
│   └── trafficCalculations.ts # Traffic prediction logic
│
├── hooks/                   # Custom React hooks
│   └── use-mobile.tsx       # Responsive breakpoint detection
│
├── lib/                     # Library configurations
│   └── utils.ts             # cn() helper dla Tailwind
│
├── App.tsx                  # Router i routing configuration
└── main.tsx                 # Entry point + React Query setup
```

## Routing i Nawigacja

### Konfiguracja Router (App.tsx)

```typescript
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Push from "./pages/Push";
// ... inne importy

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Główna strona */}
        <Route path="/" element={<Index />} />

        {/* Polskie nazwy stron */}
        <Route path="/o-projekcie" element={<OProjekcie />} />
        <Route path="/regulamin" element={<Regulamin />} />
        <Route path="/kontakt" element={<Kontakt />} />
        <Route path="/statystyki" element={<Statystyki />} />

        {/* Funkcjonalne strony */}
        <Route path="/push" element={<Push />} />
        <Route path="/rss" element={<RSS />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/kupon" element={<Kupon />} />

        {/* Catch-all MUSI być ostatni! */}
        <Route path="*" element={<Index />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**CRITICAL:** Catch-all route (`path="*"`) **musi być ostatni**, inaczej przejmie wszystkie routes.

### Nawigacja między Stronami

```typescript
import { Link, useNavigate } from "react-router-dom";

// Link component (declarative)
<Link to="/o-projekcie" className="text-blue-600">
  O projekcie
</Link>

// Programmatic navigation
const navigate = useNavigate();
navigate('/push');
```

### Nawigacja do Sekcji (Anchor Links)

```typescript
// Index.tsx - Sekcje z ID
<div id="stan-ruchu">...</div>
<div id="zglos">...</div>
<div id="na-rowerze">...</div>
<div id="cb-radio">...</div>

// Bottom navigation menu
<button
  onClick={() => {
    const element = document.getElementById('stan-ruchu');
    const header = document.querySelector('header');
    const headerHeight = header?.offsetHeight || 0;
    const elementPosition = element?.getBoundingClientRect().top + window.pageYOffset;
    if (elementPosition) {
      window.scrollTo({
        top: elementPosition - headerHeight - 10,
        behavior: 'smooth'
      });
    }
  }}
>
  Stan ruchu
</button>
```

**Uwaga:** Sticky header wymaga kompensacji wysokości przy scrollowaniu.

## State Management

### 1. Server State (React Query)

**Setup (main.tsx):**
```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 minute
      gcTime: 5 * 60 * 1000,       // 5 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

**Pattern - Fetching Traffic Reports:**
```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// W komponencie
const { data: weeklyReports, isLoading, error } = useQuery({
  queryKey: ['traffic-reports', street, direction],
  queryFn: async () => {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const { data, error } = await supabase
      .from('traffic_reports')
      .select('status, reported_at, direction')
      .eq('street', street)
      .eq('direction', direction)
      .gte('reported_at', fourWeeksAgo.toISOString())
      .order('reported_at', { ascending: false })
      .limit(5000);

    if (error) throw error;
    return data || [];
  }
});

// Loading state
if (isLoading) return <div>Ładowanie...</div>;

// Error state
if (error) return <div>Błąd: {error.message}</div>;

// Success - data is available
return <div>{weeklyReports.length} zgłoszeń</div>;
```

**Pattern - Mutations (Submitting Data):**
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();

const submitReport = useMutation({
  mutationFn: async (report: { street: string; status: string; direction: string }) => {
    const { data, error } = await supabase.functions.invoke('submit-traffic-report', {
      body: report
    });
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    // Invalidate queries to refetch
    queryClient.invalidateQueries({ queryKey: ['traffic-reports'] });
    toast.success("Zgłoszenie wysłane!");
  },
  onError: (error) => {
    toast.error(`Błąd: ${error.message}`);
  }
});

// Usage
<button onClick={() => submitReport.mutate({ street, status: 'stoi', direction })}>
  Zgłoś
</button>
```

### 2. UI State (useState, useReducer)

```typescript
import { useState, useEffect } from "react";

// Simple state
const [selectedStreet, setSelectedStreet] = useState<string>("Borowska");
const [direction, setDirection] = useState<"do centrum" | "od centrum">("do centrum");

// Complex state (useReducer for complex logic)
type State = {
  isSubscribed: boolean;
  tags: string[];
  loading: boolean;
};

type Action =
  | { type: 'SET_SUBSCRIBED'; payload: boolean }
  | { type: 'SET_TAGS'; payload: string[] }
  | { type: 'SET_LOADING'; payload: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SUBSCRIBED':
      return { ...state, isSubscribed: action.payload };
    case 'SET_TAGS':
      return { ...state, tags: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

const [state, dispatch] = useReducer(reducer, {
  isSubscribed: false,
  tags: [],
  loading: false
});
```

### 3. Persistent State (LocalStorage)

```typescript
// Save to localStorage
useEffect(() => {
  localStorage.setItem('selectedStreet', selectedStreet);
}, [selectedStreet]);

// Load from localStorage
useEffect(() => {
  const saved = localStorage.getItem('selectedStreet');
  if (saved) {
    setSelectedStreet(saved);
  }
}, []);
```

## Styling z Tailwind CSS

### Mobile-First Approach

```typescript
// ✓ Correct - mobile first, then larger breakpoints
<div className="px-1 gap-2 md:px-4 md:gap-4">
  <span className="text-xs md:text-base">Label</span>
</div>

// Breakpoints:
// sm: 640px
// md: 768px
// lg: 1024px
// xl: 1280px
// 2xl: 1536px
```

### Custom Traffic Colors

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        'traffic-stoi': '#ef4444',       // Red
        'traffic-toczy': '#f59e0b',      // Orange/Yellow
        'traffic-jedzie': '#10b981',     // Green
        'traffic-neutral': '#9ca3af',    // Grey
      }
    }
  }
}

// Usage
<div className="bg-traffic-stoi text-white">Stoi!</div>
<div className="bg-traffic-toczy text-white">Toczy się</div>
<div className="bg-traffic-jedzie text-white">Jedzie</div>
```

### Utility Helper (cn)

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage - merges classes intelligently
<div className={cn(
  "px-4 py-2",
  isActive && "bg-blue-500",
  isDisabled && "opacity-50 cursor-not-allowed"
)}>
  Content
</div>
```

### Responsive Patterns

**1. Alternating Layout (Mobile):**
```typescript
// PredictedTraffic.tsx - legend labels alternate above/below
{predictions.map((p, i) => (
  <div key={i} className="flex flex-col items-center gap-1">
    {i % 2 === 0 ? (
      <>
        <span className="text-[10px] md:text-xs">{p.time}</span>
        <div className={cn("w-full h-8 md:h-12", getColorClass(p.status))} />
      </>
    ) : (
      <>
        <div className={cn("w-full h-8 md:h-12", getColorClass(p.status))} />
        <span className="text-[10px] md:text-xs">{p.time}</span>
      </>
    )}
  </div>
))}
```

**2. Fixed-Height Containers (Icon Alignment):**
```typescript
// Bottom navigation - prevents icon misalignment
<div className="flex flex-col items-center gap-1 pt-2 pb-1">
  <Icon className="w-6 h-6 flex-shrink-0" />
  <span className="text-[10px] text-center h-8 flex items-center">
    Multi-line Text
  </span>
</div>
```

**3. Reduced Margins, Increased Gaps:**
```typescript
// ✓ Better for mobile
<div className="px-1 gap-2 md:px-4 md:gap-4">

// ✗ Too tight
<div className="px-2 gap-1">
```

## shadcn/ui Components

### Instalacja Nowego Komponentu

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

### Przykłady Użycia

**Button:**
```typescript
import { Button } from "@/components/ui/button";

<Button variant="default" size="lg" onClick={handleClick}>
  Kliknij mnie
</Button>

// Variants: default, destructive, outline, secondary, ghost, link
// Sizes: default, sm, lg, icon
```

**Card:**
```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Tytuł karty</CardTitle>
    <CardDescription>Opis karty</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Treść karty</p>
  </CardContent>
</Card>
```

**Dialog (Modal):**
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Otwórz modal</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Tytuł modalu</DialogTitle>
    </DialogHeader>
    <div>Treść modalu</div>
  </DialogContent>
</Dialog>
```

**Select:**
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<Select value={street} onValueChange={setStreet}>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Wybierz ulicę" />
  </SelectTrigger>
  <SelectContent>
    {STREETS.map(s => (
      <SelectItem key={s} value={s}>{s}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Toast (Notifications):**
```typescript
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

toast({
  title: "Sukces",
  description: "Operacja wykonana pomyślnie",
  variant: "default" // default, destructive
});

// Using sonner (alternative)
import { toast } from "sonner";
toast.success("Zgłoszenie wysłane!");
toast.error("Wystąpił błąd");
```

## Traffic Visualization Components

### 1. TrafficLine.tsx

**Cel:** Wizualna linia ruchu + integracja z Google Routes API

**Props:**
```typescript
interface TrafficLineProps {
  street: string;
  direction: 'do centrum' | 'od centrum';
  onSpeedUpdate?: (speed: number) => void;  // Callback z prędkością
}
```

**Kluczowe Features:**
- Pobiera dane z Google Routes API przez Edge Function
- Wyświetla gauge z prędkością
- Callback `onSpeedUpdate` przekazuje aktualną prędkość do parent

**Pattern:**
```typescript
const { data: trafficData } = useQuery({
  queryKey: ['traffic-data', street, direction],
  queryFn: async () => {
    const { data } = await supabase.functions.invoke('get-traffic-data', {
      body: { street, direction }
    });
    return data;
  },
  refetchInterval: 5 * 60 * 1000  // Co 5 minut
});

// Oblicz prędkość
const avgSpeed = trafficData
  ? (trafficData.distance / 1000) / (trafficData.trafficDuration / 3600)
  : null;

// Wywołaj callback
useEffect(() => {
  if (avgSpeed && onSpeedUpdate) {
    onSpeedUpdate(avgSpeed);
  }
}, [avgSpeed, onSpeedUpdate]);
```

### 2. PredictedTraffic.tsx

**Cel:** Predykcja na następną godzinę (5-minutowe przedziały)

**Critical Pattern:**
```typescript
const predictions = useMemo(() => {
  if (!weeklyReports) return [];

  const now = new Date();
  const todayDayOfWeek = now.getDay();

  // ✓ CRITICAL: Filter by direction
  const relevantReports = weeklyReports.filter((r) => {
    const reportDate = new Date(r.reported_at);
    return reportDate.getDay() === todayDayOfWeek && r.direction === direction;
  });

  // Generate 5-minute intervals for next 60 minutes
  const intervals = [];
  for (let i = 0; i < 12; i++) {
    const intervalStart = new Date(now.getTime() + i * 5 * 60 * 1000);
    // ... majority vote logic
  }

  return intervals;
}, [weeklyReports, direction]); // ← MUST include direction!
```

### 3. TodayTimeline.tsx

**Cel:** Timeline dnia dzisiejszego (1-godzinne przedziały)

**Pattern:**
```typescript
const timeline = useMemo(() => {
  if (!weeklyReports) return [];

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  const intervals = [];
  for (let hour = 0; hour < 24; hour++) {
    const hourStart = new Date(startOfDay.getTime() + hour * 60 * 60 * 1000);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    // Filter reports in this hour + same direction
    const reportsInHour = weeklyReports.filter(r => {
      const reportDate = new Date(r.reported_at);
      return reportDate >= hourStart && reportDate < hourEnd && r.direction === direction;
    });

    // Majority vote
    const statusCounts = { stoi: 0, toczy_sie: 0, jedzie: 0 };
    reportsInHour.forEach(r => statusCounts[r.status]++);
    const majorityStatus = Object.keys(statusCounts).reduce((a, b) =>
      statusCounts[a] > statusCounts[b] ? a : b
    );

    intervals.push({
      hour: `${hour}:00`,
      status: reportsInHour.length > 0 ? majorityStatus : 'neutral'
    });
  }

  return intervals;
}, [weeklyReports, direction]); // ← direction in deps
```

### 4. WeeklyTimeline.tsx

**Cel:** Timeline tygodniowy (30-minutowe przedziały, 5:00-22:00)

**Pattern:**
```typescript
const weeklyTimeline = useMemo(() => {
  if (!weeklyReports) return [];

  const days = [];
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 5, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(22, 0, 0);

    const slots = [];
    for (let time = dayStart; time < dayEnd; time.setMinutes(time.getMinutes() + 30)) {
      const slotEnd = new Date(time.getTime() + 30 * 60 * 1000);

      const reportsInSlot = weeklyReports.filter(r => {
        const reportDate = new Date(r.reported_at);
        return reportDate >= time && reportDate < slotEnd && r.direction === direction;
      });

      // Majority vote
      slots.push({
        time: `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`,
        status: calculateMajorityStatus(reportsInSlot)
      });
    }

    days.push({
      date: dayStart.toLocaleDateString('pl-PL'),
      slots
    });
  }

  return days;
}, [weeklyReports, direction]);
```

### 5. GreenWave.tsx

**Cel:** Optymalna godzina wyjazdu (10-minutowe przedziały, ostatnie 7 dni)

**Pattern:**
```typescript
const greenWaveData = useMemo(() => {
  if (!weeklyReports) return [];

  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const relevantReports = weeklyReports.filter(r => {
    const reportDate = new Date(r.reported_at);
    return reportDate >= last7Days && r.direction === direction;
  });

  // Group by 10-minute intervals
  const intervals = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 10) {
      const reportsInInterval = relevantReports.filter(r => {
        const reportDate = new Date(r.reported_at);
        return reportDate.getHours() === hour &&
               reportDate.getMinutes() >= minute &&
               reportDate.getMinutes() < minute + 10;
      });

      const greenPercentage = reportsInInterval.length > 0
        ? (reportsInInterval.filter(r => r.status === 'jedzie').length / reportsInInterval.length) * 100
        : 0;

      intervals.push({
        time: `${hour}:${minute.toString().padStart(2, '0')}`,
        greenPercentage
      });
    }
  }

  // Sort by greenPercentage descending
  return intervals.sort((a, b) => b.greenPercentage - a.greenPercentage);
}, [weeklyReports, direction]);
```

## OneSignal Integration

### Initialization (index.html)

```html
<!-- OneSignal SDK v16 -->
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: "YOUR_ONESIGNAL_APP_ID",
      safari_web_id: "web.onesignal.auto.YOUR_ID",
      notifyButton: {
        enable: false,
      },
      allowLocalhostAsSecureOrigin: true
    });

    // Foreground notification handler
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
      event.preventDefault();
      const notification = event.notification;
      // Display custom UI or use toast
      console.log('[OneSignal] Foreground notification:', notification);
    });
  });
</script>
```

### Service Worker (public/OneSignalSDKWorker.js)

```javascript
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js');
```

### Helper Functions (utils/onesignal.ts)

```typescript
export async function subscribeToStreet(street: string): Promise<boolean> {
  try {
    const OneSignal = window.OneSignal;
    if (!OneSignal) throw new Error('OneSignal not initialized');

    // Request permission
    const permission = await OneSignal.Notifications.requestPermission();
    if (!permission) return false;

    // Add tag
    const tagKey = `street_${street.toLowerCase()}`;
    await OneSignal.User.addTag(tagKey, '1');

    console.log(`[OneSignal] Subscribed to ${tagKey}`);
    return true;
  } catch (error) {
    console.error('[OneSignal] Subscribe error:', error);
    return false;
  }
}

export async function unsubscribeFromStreet(street: string): Promise<boolean> {
  try {
    const OneSignal = window.OneSignal;
    if (!OneSignal) throw new Error('OneSignal not initialized');

    const tagKey = `street_${street.toLowerCase()}`;
    await OneSignal.User.removeTag(tagKey);

    console.log(`[OneSignal] Unsubscribed from ${tagKey}`);
    return true;
  } catch (error) {
    console.error('[OneSignal] Unsubscribe error:', error);
    return false;
  }
}

export async function checkSubscriptionStatus(street: string): Promise<boolean> {
  try {
    const OneSignal = window.OneSignal;
    if (!OneSignal) return false;

    const tags = await OneSignal.User.getTags();
    const tagKey = `street_${street.toLowerCase()}`;

    return tags[tagKey] === '1';
  } catch (error) {
    console.error('[OneSignal] Check status error:', error);
    return false;
  }
}
```

**CRITICAL:** Tag format jest `street_<name>` w lowercase (np. `street_borowska`).

### Component Usage

```typescript
import { subscribeToStreet, checkSubscriptionStatus } from "@/utils/onesignal";

function PushNotificationButton({ street }: { street: string }) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    checkSubscriptionStatus(street).then(setIsSubscribed);
  }, [street]);

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribeFromStreet(street);
      setIsSubscribed(false);
    } else {
      const success = await subscribeToStreet(street);
      setIsSubscribed(success);
    }
  };

  return (
    <Button onClick={handleToggle}>
      {isSubscribed ? 'Wyłącz powiadomienia' : 'Włącz powiadomienia'}
    </Button>
  );
}
```

## QR Code Scanning

### Implementation (components/QRCodeScanner.tsx)

```typescript
import { useRef, useEffect } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";

interface QRCodeScannerProps {
  scanning: boolean;
  onScanSuccess: (result: string) => void;
  onScanError?: (error: string) => void;
}

export function QRCodeScanner({ scanning, onScanSuccess, onScanError }: QRCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isProcessingScanRef = useRef(false);
  const activeStreamRef = useRef<MediaStream | null>(null);

  // Initialize camera when scanning starts
  useEffect(() => {
    if (!scanning || !videoRef.current) return;

    const initCamera = async () => {
      try {
        const reader = new BrowserQRCodeReader();

        await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result, error) => {
          if (result && !isProcessingScanRef.current) {
            isProcessingScanRef.current = true;
            onScanSuccess(result.getText());
          }
          if (error && error.name !== 'NotFoundException') {
            onScanError?.(error.message);
          }
        });

        // Store stream for cleanup
        if (videoRef.current?.srcObject) {
          activeStreamRef.current = videoRef.current.srcObject as MediaStream;
        }
      } catch (error) {
        onScanError?.(error.message);
      }
    };

    initCamera();

    // Cleanup
    return () => {
      activeStreamRef.current?.getTracks().forEach(track => track.stop());
      activeStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      isProcessingScanRef.current = false;
    };
  }, [scanning]);

  if (!scanning) return null;

  return (
    <div className="relative w-full max-w-md mx-auto">
      <video ref={videoRef} className="w-full h-auto rounded-lg" />
      <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />
    </div>
  );
}
```

**Critical Patterns:**
1. Use `BrowserQRCodeReader` (not `BrowserMultiFormatReader`)
2. Prevent duplicate scans with `isProcessingScanRef`
3. Clean up camera streams properly
4. Initialize camera in useEffect when video element mounts

## Performance Optimization

### 1. React.memo dla Heavy Components

```typescript
import { memo } from "react";

export const WeeklyTimeline = memo(({ street, direction, weeklyReports }) => {
  // ... heavy computation
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.street === nextProps.street &&
         prevProps.direction === nextProps.direction;
});
```

### 2. useMemo dla Expensive Calculations

```typescript
const predictions = useMemo(() => {
  // Expensive calculation
  return calculatePredictions(weeklyReports, street, direction);
}, [weeklyReports, street, direction]);
```

### 3. useCallback dla Event Handlers

```typescript
const handleSubmit = useCallback((status: string) => {
  submitReport.mutate({ street, status, direction });
}, [street, direction, submitReport]);
```

### 4. Code Splitting (React.lazy)

```typescript
import { lazy, Suspense } from "react";

const Statystyki = lazy(() => import("./pages/Statystyki"));

// Usage
<Suspense fallback={<div>Ładowanie...</div>}>
  <Route path="/statystyki" element={<Statystyki />} />
</Suspense>
```

## Error Handling

### Error Boundaries

```typescript
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 border border-red-400 rounded">
          <h2 className="text-red-800 font-bold">Wystąpił błąd</h2>
          <p className="text-red-600">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### Query Error Handling

```typescript
const { data, error, isError } = useQuery({
  queryKey: ['traffic-reports'],
  queryFn: fetchTrafficReports,
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

if (isError) {
  return (
    <div className="p-4 bg-red-100 rounded">
      <p className="text-red-800">Błąd: {error.message}</p>
      <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['traffic-reports'] })}>
        Spróbuj ponownie
      </Button>
    </div>
  );
}
```

## Testing

### Component Testing (Vitest + React Testing Library)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TrafficLine from './TrafficLine';

describe('TrafficLine', () => {
  it('renders traffic gauge', () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <TrafficLine street="Borowska" direction="do centrum" />
      </QueryClientProvider>
    );

    expect(screen.getByText(/Średnia prędkość/i)).toBeInTheDocument();
  });

  it('calls onSpeedUpdate when speed is fetched', async () => {
    const onSpeedUpdate = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <TrafficLine street="Borowska" direction="do centrum" onSpeedUpdate={onSpeedUpdate} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(onSpeedUpdate).toHaveBeenCalledWith(expect.any(Number));
    });
  });
});
```

### E2E Testing (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('user can submit traffic report', async ({ page }) => {
  await page.goto('http://localhost:8080');

  // Select street
  await page.click('text=Wybierz ulicę');
  await page.click('text=Borowska');

  // Select direction
  await page.click('text=do centrum');

  // Submit "stoi" status
  await page.click('button:has-text("Stoi")');

  // Verify success toast
  await expect(page.locator('text=Zgłoszenie wysłane!')).toBeVisible();
});
```

## Best Practices Checklist

### Przed Stworzeniem Nowego Komponentu

- [ ] Nazwij komponent PascalCase (np. `TrafficLine.tsx`)
- [ ] Zdefiniuj Props interface
- [ ] Użyj TypeScript strict types
- [ ] Dodaj PropTypes lub TypeScript validation
- [ ] Używaj `@/` path alias dla importów
- [ ] Komponenty UI powinny być w `components/ui/`
- [ ] Komponenty feature powinny być w `components/`
- [ ] Strony powinny być w `pages/`

### Podczas Implementacji

- [ ] Używaj React Query dla server state
- [ ] Używaj useState/useReducer dla UI state
- [ ] Używaj useMemo dla expensive calculations
- [ ] Używaj useCallback dla event handlers
- [ ] Dodaj loading states
- [ ] Dodaj error handling
- [ ] Dodaj accessibility (aria-labels, keyboard navigation)
- [ ] Używaj semantic HTML
- [ ] **Polskie teksty** dla wszystkich UI elementów

### Traffic Prediction Components

- [ ] Fetch 4 weeks (28 days) of data
- [ ] Filter by day-of-week (same as today)
- [ ] Filter by direction
- [ ] Include `direction` in useMemo deps
- [ ] Use majority vote for status
- [ ] Handle empty data gracefully

### Styling

- [ ] Mobile-first approach (base styles, then md:, lg:, etc.)
- [ ] Użyj custom traffic colors (`bg-traffic-stoi`, etc.)
- [ ] Używaj `cn()` helper dla conditional classes
- [ ] Testuj na mobile (iPhone, Android)
- [ ] Testuj na różnych breakpointach

### Before Committing

- [ ] Wszystkie typy TypeScript są poprawne
- [ ] Brak console.errors w przeglądarce
- [ ] Brak console.warnings (oprócz dev tools)
- [ ] Component renderuje się poprawnie
- [ ] Loading states działają
- [ ] Error states działają
- [ ] Responsive design działa
- [ ] Accessibility sprawdzone (lighthouse, axe)

## Common Anti-Patterns

### ✗ BAD: Brak direction w deps

```typescript
const predictions = useMemo(() => {
  const filtered = reports?.filter(r => r.direction === direction);
  return processData(filtered);
}, [reports, street]); // ← Missing direction!
```

### ✓ GOOD: Direction w deps

```typescript
const predictions = useMemo(() => {
  const filtered = reports?.filter(r => r.direction === direction);
  return processData(filtered);
}, [reports, street, direction]); // ← Includes direction
```

### ✗ BAD: English text

```typescript
<Button>Submit Report</Button>
toast.success("Report submitted!");
```

### ✓ GOOD: Polish text

```typescript
<Button>Zgłoś</Button>
toast.success("Zgłoszenie wysłane!");
```

### ✗ BAD: Inline styles

```typescript
<div style={{ color: 'red', padding: '10px' }}>Error</div>
```

### ✓ GOOD: Tailwind classes

```typescript
<div className="text-red-600 p-2.5">Błąd</div>
```

### ✗ BAD: Direct fetch

```typescript
useEffect(() => {
  fetch('/api/traffic-reports')
    .then(r => r.json())
    .then(setData);
}, []);
```

### ✓ GOOD: React Query

```typescript
const { data } = useQuery({
  queryKey: ['traffic-reports'],
  queryFn: fetchTrafficReports
});
```

## Podsumowanie

**Total Components:** 30+
**Total Pages:** 9
**State Management:** React Query (server) + useState (UI)
**Styling:** Tailwind CSS (mobile-first)
**Component Library:** shadcn/ui (Radix + Tailwind)
**External Integrations:** Supabase, OneSignal, Google Routes, @zxing/browser

**Key Patterns:**
- Mobile-first responsive design
- React Query dla wszystkich API calls
- Traffic predictions: 4 weeks data, day-of-week filter, direction in deps
- OneSignal tags: `street_<name>` lowercase
- Polish language 100%
- shadcn/ui components dla UI

---

**Ostatnia aktualizacja:** 12 grudnia 2025
**Status:** Aktywny rozwój
**Framework Version:** React 18.3.1
