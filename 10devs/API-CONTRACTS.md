# API Contracts - Supabase Edge Functions

## Przegląd

Projekt wykorzystuje **Supabase Edge Functions** (Deno runtime) jako backend API. Wszystkie funkcje są w `supabase/functions/`, używają **TypeScript**, i są deployowane jako **serverless functions**.

## Podstawowe Zasady

### 1. Struktura Edge Function

**Standardowy Template:**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // 2. Parse request
    const body = await req.json();

    // 3. Validate input
    if (!body.requiredField) {
      return new Response(
        JSON.stringify({ error: 'Missing required field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Business logic
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('table_name')
      .insert({ ...body });

    if (error) throw error;

    // 5. Return response
    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 2. Konwencje Nazewnictwa

- **Funkcje:** kebab-case (`submit-traffic-report`, `get-weather-forecast`)
- **DTO Interfaces:** PascalCase z suffiksem Request/Response (`SubmitTrafficReportRequest`)
- **Pola DTO:** camelCase w TypeScript, snake_case w bazie danych

### 3. Iteracyjne Podejście 3x3

**Iteracja 1: MVP Endpoint**
- ✅ Podstawowa funkcjonalność (happy path)
- ✅ CORS headers
- ✅ Minimalna walidacja
- ✅ Prosty response

**Iteracja 2: Production Ready**
- ✅ Pełna walidacja wszystkich pól
- ✅ Error handling ze szczegółowymi komunikatami
- ✅ Rate limiting (jeśli potrzebne)
- ✅ Logging

**Iteracja 3: Optimization**
- ✅ Performance tuning (batch operations, indexes)
- ✅ Security hardening (input sanitization, SQL injection prevention)
- ✅ Monitoring i metrics
- ✅ API documentation

## Kategorie Endpoints

### 1. Traffic Endpoints

#### 1.1 Submit Traffic Report

**Funkcja:** `submit-traffic-report`
**Metoda:** POST
**Opis:** Przyjmuje zgłoszenie użytkownika o stanie ruchu na ulicy.

**Request DTO:**
```typescript
interface SubmitTrafficReportRequest {
  street: string;              // Nazwa ulicy (np. "Borowska")
  status: 'stoi' | 'toczy_sie' | 'jedzie';  // Status ruchu
  direction: 'do centrum' | 'od centrum';   // Kierunek ruchu
  speed?: number;              // Prędkość w km/h (opcjonalne, z Google Routes API)
  user_fingerprint?: string;   // Anonimowa identyfikacja użytkownika
}
```

**Response DTO:**
```typescript
interface SubmitTrafficReportResponse {
  success: boolean;
  data?: {
    id: string;                // UUID zgłoszenia
    reported_at: string;       // Timestamp (ISO 8601)
  };
  error?: string;
}
```

**Walidacja:**
```typescript
// Required fields
if (!street || !status || !direction) {
  return { error: 'Brakuje wymaganych pól: street, status, direction', status: 400 };
}

// Enum validation
const validStatuses = ['stoi', 'toczy_sie', 'jedzie'];
if (!validStatuses.includes(status)) {
  return { error: `Nieprawidłowy status. Dozwolone: ${validStatuses.join(', ')}`, status: 400 };
}

const validDirections = ['do centrum', 'od centrum'];
if (!validDirections.includes(direction)) {
  return { error: `Nieprawidłowy kierunek. Dozwolone: ${validDirections.join(', ')}`, status: 400 };
}

// Optional speed validation
if (speed !== undefined && (speed < 0 || speed > 200)) {
  return { error: 'Prędkość musi być między 0 a 200 km/h', status: 400 };
}
```

**Example Usage:**
```typescript
// Frontend (React Query)
const submitReport = useMutation({
  mutationFn: async (report: SubmitTrafficReportRequest) => {
    const { data } = await supabase.functions.invoke('submit-traffic-report', {
      body: report
    });
    return data;
  }
});

// Usage
submitReport.mutate({
  street: 'Borowska',
  status: 'stoi',
  direction: 'do centrum',
  speed: 15.5,
  user_fingerprint: 'abc123'
});
```

#### 1.2 Auto-Submit Traffic Report

**Funkcja:** `auto-submit-traffic-report`
**Metoda:** POST
**Opis:** Automatyczne zgłoszenie ruchu na podstawie danych z Google Routes API.

**Request DTO:**
```typescript
interface AutoSubmitTrafficReportRequest {
  street: string;
  direction: 'do centrum' | 'od centrum';
  speed: number;               // Prędkość z Google Routes API (wymagane)
  user_fingerprint?: string;
}
```

**Response DTO:**
```typescript
interface AutoSubmitTrafficReportResponse {
  success: boolean;
  data?: {
    id: string;
    status: 'stoi' | 'toczy_sie' | 'jedzie';  // Status wyznaczony automatycznie
    reported_at: string;
  };
  error?: string;
}
```

**Logika Biznesowa:**
```typescript
// Auto-determine status from speed
function determineStatusFromSpeed(speed: number): 'stoi' | 'toczy_sie' | 'jedzie' {
  if (speed < 10) return 'stoi';
  if (speed < 30) return 'toczy_se';
  return 'jedzie';
}
```

#### 1.3 Get Traffic Data

**Funkcja:** `get-traffic-data`
**Metoda:** POST
**Opis:** Pobiera dane o ruchu z Google Routes API dla danej ulicy.

**Request DTO:**
```typescript
interface GetTrafficDataRequest {
  street: string;
  direction: 'do centrum' | 'od centrum';
}
```

**Response DTO:**
```typescript
interface GetTrafficDataResponse {
  success: boolean;
  data?: {
    distance: number;          // Dystans w metrach
    duration: number;          // Czas przejazdu bez ruchu (sekundy)
    trafficDuration: number;   // Czas przejazdu z ruchem (sekundy)
    speed: number;             // Prędkość średnia (km/h)
    delay: number;             // Opóźnienie (sekundy)
  };
  error?: string;
}
```

**External API Integration:**
```typescript
// Google Routes API call
const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': Deno.env.get('GOOGLE_ROUTES_API_KEY'),
    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.duration_in_traffic'
  },
  body: JSON.stringify({
    origin: { placeId: originPlaceId },
    destination: { placeId: destinationPlaceId },
    travelMode: 'DRIVE',
    computeAlternativeRoutes: false
  })
});
```

#### 1.4 Get Traffic Data Batch

**Funkcja:** `get-traffic-data-batch`
**Metoda:** POST
**Opis:** Pobiera dane o ruchu dla wielu ulic jednocześnie (optymalizacja).

**Request DTO:**
```typescript
interface GetTrafficDataBatchRequest {
  streets: Array<{
    street: string;
    direction: 'do centrum' | 'od centrum';
  }>;
}
```

**Response DTO:**
```typescript
interface GetTrafficDataBatchResponse {
  success: boolean;
  data?: Array<{
    street: string;
    direction: string;
    distance: number;
    duration: number;
    trafficDuration: number;
    speed: number;
    delay: number;
  }>;
  errors?: Array<{
    street: string;
    error: string;
  }>;
}
```

**Optimization Pattern:**
```typescript
// Parallel processing with Promise.allSettled
const results = await Promise.allSettled(
  streets.map(({ street, direction }) =>
    fetchTrafficData(street, direction)
  )
);

const data = results
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value);

const errors = results
  .filter(r => r.status === 'rejected')
  .map(r => ({ street: r.reason.street, error: r.reason.message }));
```

#### 1.5 Auto Traffic Monitor

**Funkcja:** `auto-traffic-monitor`
**Metoda:** POST (cron trigger)
**Opis:** Cron job uruchamiany co 5 minut, pobiera dane dla wszystkich ulic i automatycznie wysyła zgłoszenia.

**Request DTO:**
```typescript
// No request body (triggered by cron)
interface AutoTrafficMonitorRequest {}
```

**Response DTO:**
```typescript
interface AutoTrafficMonitorResponse {
  success: boolean;
  data?: {
    processed: number;         // Liczba przetworzonych ulic
    successful: number;        // Liczba udanych zgłoszeń
    failed: number;            // Liczba błędów
  };
  errors?: string[];
}
```

### 2. Community Endpoints

#### 2.1 Submit Chat Message

**Funkcja:** `submit-chat-message`
**Metoda:** POST
**Opis:** Wysyła wiadomość na czacie ulicy z rate limitingiem.

**Request DTO:**
```typescript
interface SubmitChatMessageRequest {
  street: string;
  message: string;             // Max 500 znaków
  user_fingerprint: string;    // Wymagane dla rate limiting
}
```

**Response DTO:**
```typescript
interface SubmitChatMessageResponse {
  success: boolean;
  data?: {
    id: string;
    created_at: string;
  };
  error?: string;
}
```

**Rate Limiting:**
```typescript
// Check rate limit: 10 wiadomości/godzinę
const { count } = await supabase
  .from('chat_messages')
  .select('*', { count: 'exact', head: true })
  .eq('user_fingerprint', user_fingerprint)
  .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

if (count >= 10) {
  return {
    error: 'Przekroczono limit wiadomości (10/godzinę)',
    status: 429
  };
}
```

**Walidacja:**
```typescript
// Message length
if (message.length > 500) {
  return { error: 'Wiadomość może mieć maksymalnie 500 znaków', status: 400 };
}

// Content moderation (basic)
const forbiddenWords = ['spam', 'reklama']; // Przykład
if (forbiddenWords.some(word => message.toLowerCase().includes(word))) {
  return { error: 'Wiadomość zawiera niedozwolone treści', status: 400 };
}
```

#### 2.2 Submit Incident Report

**Funkcja:** `submit-incident-report`
**Metoda:** POST
**Opis:** Zgłoszenie incydentu (wypadek, roboty drogowe, zamknięcie).

**Request DTO:**
```typescript
interface SubmitIncidentReportRequest {
  street: string;
  type: 'accident' | 'roadwork' | 'closure' | 'other';
  description?: string;        // Opcjonalny szczegółowy opis
  user_fingerprint?: string;
}
```

**Response DTO:**
```typescript
interface SubmitIncidentReportResponse {
  success: boolean;
  data?: {
    id: string;
    created_at: string;
  };
  error?: string;
}
```

#### 2.3 Submit Street Vote

**Funkcja:** `submit-street-vote`
**Metoda:** POST
**Opis:** Głosowanie na ulicę do monitorowania. Jeden głos per użytkownik per ulica.

**Request DTO:**
```typescript
interface SubmitStreetVoteRequest {
  street_name: string;
  user_fingerprint: string;
}
```

**Response DTO:**
```typescript
interface SubmitStreetVoteResponse {
  success: boolean;
  data?: {
    id: string;
    created_at: string;
  };
  error?: string;
}
```

**Unique Constraint Handling:**
```typescript
// Database has UNIQUE(street_name, user_fingerprint)
const { data, error } = await supabase
  .from('street_votes')
  .insert({ street_name, user_fingerprint });

if (error?.code === '23505') {  // Duplicate key violation
  return {
    success: false,
    error: 'Już zagłosowałeś na tę ulicę'
  };
}
```

#### 2.4 Submit Carpooling Vote

**Funkcja:** `submit-carpooling-vote`
**Metoda:** POST
**Opis:** Głosowanie na wspólny przejazd (carpooling).

**Request DTO:**
```typescript
interface SubmitCarpoolingVoteRequest {
  street: string;
  direction: 'do centrum' | 'od centrum';
  time_slot: string;           // Format: "HH:MM-HH:MM" (np. "07:00-08:00")
  user_fingerprint: string;
}
```

**Response DTO:**
```typescript
interface SubmitCarpoolingVoteResponse {
  success: boolean;
  data?: {
    id: string;
    created_at: string;
    current_votes: number;     // Liczba głosów w tym time slot
  };
  error?: string;
}
```

**Aggregation:**
```typescript
// Count votes for this time slot
const { count } = await supabase
  .from('carpooling_votes')
  .select('*', { count: 'exact', head: true })
  .eq('street', street)
  .eq('direction', direction)
  .eq('time_slot', time_slot)
  .gte('created_at', today); // Only today's votes
```

### 3. Notification Endpoints

#### 3.1 Send Push Notifications

**Funkcja:** `send-push-notifications`
**Metoda:** POST
**Opis:** Wysyła powiadomienie push przez OneSignal do użytkowników subskrybujących daną ulicę.

**Request DTO:**
```typescript
interface SendPushNotificationsRequest {
  street: string;
  title: string;               // Tytuł powiadomienia (np. "Borowska - Stoi!")
  message: string;             // Treść powiadomienia
  data?: {                     // Dodatkowe dane (deep linking)
    url?: string;
    action?: string;
  };
}
```

**Response DTO:**
```typescript
interface SendPushNotificationsResponse {
  success: boolean;
  data?: {
    notification_id: string;   // OneSignal notification ID
    recipients: number;        // Liczba wysłanych powiadomień
  };
  error?: string;
}
```

**OneSignal Integration:**
```typescript
// Create notification via OneSignal API
const response = await fetch('https://onesignal.com/api/v1/notifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${Deno.env.get('ONESIGNAL_REST_API_KEY')}`
  },
  body: JSON.stringify({
    app_id: Deno.env.get('ONESIGNAL_APP_ID'),
    headings: { en: title },
    contents: { en: message },
    filters: [
      { field: 'tag', key: `street_${street.toLowerCase()}`, relation: '=', value: '1' }
    ],
    data: data || {}
  })
});
```

### 4. Utility Endpoints

#### 4.1 Get Weather Forecast

**Funkcja:** `get-weather-forecast`
**Metoda:** POST
**Opis:** Pobiera prognozę pogody dla Wrocławia.

**Request DTO:**
```typescript
interface GetWeatherForecastRequest {
  // No parameters - always Wrocław
}
```

**Response DTO:**
```typescript
interface GetWeatherForecastResponse {
  success: boolean;
  data?: {
    temperature: number;       // Temperatura (°C)
    humidity: number;          // Wilgotność (%)
    description: string;       // Opis pogody (np. "Pochmurno")
    icon: string;              // Kod ikony
    wind_speed: number;        // Prędkość wiatru (m/s)
  };
  error?: string;
}
```

#### 4.2 Fetch RSS Feed

**Funkcja:** `fetch-rss-feed`
**Metoda:** GET
**Opis:** Generuje RSS feed z ostatnimi zgłoszeniami ruchu.

**Request DTO:**
```typescript
// Query parameters
interface FetchRSSFeedRequest {
  street?: string;             // Opcjonalnie filtruj po ulicy
  limit?: number;              // Limit wpisów (domyślnie 20)
}
```

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Czy ulica stoi? - Wrocław Traffic</title>
    <link>https://czyulicastoi.pl</link>
    <description>Aktualny stan ruchu we Wrocławiu</description>
    <item>
      <title>Borowska - Stoi (do centrum)</title>
      <description>Status: stoi, Kierunek: do centrum, Prędkość: 12 km/h</description>
      <pubDate>Thu, 12 Dec 2025 10:30:00 GMT</pubDate>
      <guid>uuid-here</guid>
    </item>
  </channel>
</rss>
```

#### 4.3 Create Donation Payment

**Funkcja:** `create-donation-payment`
**Metoda:** POST
**Opis:** Tworzy płatność donacji (integracja z systemem płatności).

**Request DTO:**
```typescript
interface CreateDonationPaymentRequest {
  amount: number;              // Kwota w PLN
  email?: string;              // Email płacącego (opcjonalnie)
}
```

**Response DTO:**
```typescript
interface CreateDonationPaymentResponse {
  success: boolean;
  data?: {
    payment_id: string;
    payment_url: string;       // URL do przekierowania
    amount: number;
  };
  error?: string;
}
```

#### 4.4 Record Visit

**Funkcja:** `record-visit`
**Metoda:** POST
**Opis:** Zapisuje statystykę wizyty na stronie (analytics).

**Request DTO:**
```typescript
interface RecordVisitRequest {
  page: string;                // URL strony
  user_fingerprint?: string;
}
```

**Response DTO:**
```typescript
interface RecordVisitResponse {
  success: boolean;
  data?: {
    id: string;
  };
  error?: string;
}
```

## Error Handling

### Standardowe Kody Błędów

```typescript
// 400 Bad Request - Błędne dane wejściowe
{
  error: 'Brakuje wymaganych pól: street, status',
  status: 400
}

// 401 Unauthorized - Brak autoryzacji
{
  error: 'Nieautoryzowany dostęp',
  status: 401
}

// 403 Forbidden - Brak uprawnień
{
  error: 'Brak uprawnień do wykonania tej operacji',
  status: 403
}

// 429 Too Many Requests - Rate limiting
{
  error: 'Przekroczono limit zapytań. Spróbuj ponownie za 60 sekund',
  status: 429,
  retry_after: 60
}

// 500 Internal Server Error - Błąd serwera
{
  error: 'Wewnętrzny błąd serwera',
  status: 500
}

// 503 Service Unavailable - Serwis niedostępny
{
  error: 'Serwis tymczasowo niedostępny',
  status: 503,
  retry_after: 300
}
```

### Error Logging Pattern

```typescript
try {
  // Business logic
} catch (error) {
  // Log full error for debugging
  console.error('[EdgeFunction] Error:', {
    function: 'submit-traffic-report',
    error: error.message,
    stack: error.stack,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Return user-friendly error
  return new Response(
    JSON.stringify({
      error: 'Wystąpił błąd podczas przetwarzania żądania',
      details: Deno.env.get('ENVIRONMENT') === 'development' ? error.message : undefined
    }),
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
```

## Security Best Practices

### 1. Input Validation

```typescript
// Always validate and sanitize input
function sanitizeString(input: string, maxLength: number): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential HTML tags
}

const street = sanitizeString(body.street, 100);
const message = sanitizeString(body.message, 500);
```

### 2. SQL Injection Prevention

```typescript
// ✓ Safe - Supabase client uses parameterized queries
const { data } = await supabase
  .from('traffic_reports')
  .select('*')
  .eq('street', userInput); // Safe

// ✗ Dangerous - Never use raw SQL with user input
const { data } = await supabase
  .rpc('raw_query', {
    query: `SELECT * FROM traffic_reports WHERE street = '${userInput}'`
  }); // VULNERABLE!
```

### 3. Rate Limiting

```typescript
// Implement rate limiting for all public endpoints
async function checkRateLimit(
  fingerprint: string,
  limit: number,
  windowMinutes: number
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  const { count } = await supabase
    .from('rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_fingerprint', fingerprint)
    .gte('created_at', windowStart.toISOString());

  return count < limit;
}
```

### 4. CORS Configuration

```typescript
// Specific CORS for production
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ENVIRONMENT') === 'production'
    ? 'https://czyulicastoi.pl'
    : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400', // 24 hours
};
```

## Testing Strategy

### Unit Testing (Deno Test)

```typescript
// submit-traffic-report.test.ts
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test("validateStatus - accepts valid status", () => {
  const result = validateStatus('stoi');
  assertEquals(result.valid, true);
});

Deno.test("validateStatus - rejects invalid status", () => {
  const result = validateStatus('invalid');
  assertEquals(result.valid, false);
  assertEquals(result.error, 'Nieprawidłowy status');
});
```

### Integration Testing

```typescript
// Test full endpoint flow
Deno.test("submit-traffic-report - full flow", async () => {
  const response = await fetch('http://localhost:54321/functions/v1/submit-traffic-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      street: 'Borowska',
      status: 'stoi',
      direction: 'do centrum'
    })
  });

  const data = await response.json();
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
});
```

## Deployment

### Local Development

```bash
# Start Supabase locally
npx supabase start

# Serve function locally
npx supabase functions serve submit-traffic-report

# Test locally
curl -i http://localhost:54321/functions/v1/submit-traffic-report \
  -H "Content-Type: application/json" \
  -d '{"street":"Borowska","status":"stoi","direction":"do centrum"}'
```

### Production Deployment

```bash
# Deploy single function
npx supabase functions deploy submit-traffic-report

# Deploy all functions
npx supabase functions deploy

# Set secrets
npx supabase secrets set GOOGLE_ROUTES_API_KEY=your-key
npx supabase secrets set ONESIGNAL_REST_API_KEY=your-key
```

## Monitoring

### Performance Metrics

```typescript
// Add timing logs
const startTime = Date.now();

// ... business logic ...

const duration = Date.now() - startTime;
console.log(`[Performance] ${functionName} completed in ${duration}ms`);

// Alert if slow
if (duration > 5000) {
  console.warn(`[Performance] ${functionName} took ${duration}ms - SLOW!`);
}
```

### Error Tracking

```typescript
// Log errors to external service (e.g., Sentry)
if (error) {
  await fetch('https://sentry.io/api/...', {
    method: 'POST',
    body: JSON.stringify({
      level: 'error',
      message: error.message,
      extra: {
        function: functionName,
        user: user_fingerprint,
        timestamp: new Date().toISOString()
      }
    })
  });
}
```

## API Versioning

### Current: No Versioning (MVP)

Wszystkie endpointy są bez wersjonowania:
- `/functions/v1/submit-traffic-report`

### Future: Semantic Versioning

Gdy API będzie stabilne:
```
/functions/v2/submit-traffic-report  (nowa wersja)
/functions/v1/submit-traffic-report  (stara wersja, deprecated)
```

**Deprecation Notice:**
```typescript
// Add header to deprecated endpoints
headers: {
  ...corsHeaders,
  'X-API-Deprecation': 'This endpoint is deprecated. Use /v2/ instead',
  'X-API-Sunset': '2026-12-31'
}
```

## Best Practices Checklist

### Przed Stworzeniem Nowego Endpoint

- [ ] Zdefiniuj Request DTO interface
- [ ] Zdefiniuj Response DTO interface
- [ ] Dodaj walidację wszystkich wymaganych pól
- [ ] Dodaj CORS headers
- [ ] Implementuj error handling
- [ ] Dodaj logging (start, success, errors)
- [ ] Rozważ rate limiting
- [ ] Napisz unit testy
- [ ] Napisz integration test
- [ ] Udokumentuj w tym pliku

### Przed Deploymentem do Production

- [ ] Wszystkie testy przechodzą
- [ ] Error handling pokrywa wszystkie edge cases
- [ ] Logging jest odpowiedni (nie za dużo, nie za mało)
- [ ] Secrets są ustawione w Supabase
- [ ] CORS jest skonfigurowany dla production domain
- [ ] Performance testing wykonane (load test)
- [ ] Security review wykonany
- [ ] Dokumentacja zaktualizowana

## Podsumowanie

**Total Edge Functions:** 14+
**Total DTO Interfaces:** 28+ (Request + Response dla każdego)
**Validation Rules:** 50+ checks
**Error Handling:** Standardized across all endpoints

**Iteracyjne Podejście:**
- Iteracja 1: MVP (basic functionality)
- Iteracja 2: Production Ready (full validation, error handling)
- Iteracja 3: Optimization (performance, security, monitoring)

---

**Ostatnia aktualizacja:** 12 grudnia 2025
**Status:** Aktywny rozwój
**Maintainer:** Grzegorz Malopolski
