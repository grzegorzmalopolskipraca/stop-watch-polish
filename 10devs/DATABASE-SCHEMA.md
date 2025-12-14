# Database Schema - PostgreSQL + Supabase

## Przegląd

Projekt wykorzystuje **PostgreSQL** przez **Supabase** jako backend. Wszystkie migracje są w `supabase/migrations/`, a typy TypeScript generowane automatycznie w `src/integrations/supabase/types.ts`.

## Podstawowe Zasady

### 1. Konwencje Nazewnictwa

- **Tabele:** snake_case, liczba mnoga (`traffic_reports`, `chat_messages`)
- **Kolumny:** snake_case (`user_fingerprint`, `reported_at`)
- **Primary Keys:** zawsze `id UUID`
- **Foreign Keys:** `{table_singular}_id` (np. `location_id`)

### 2. Standardowe Kolumny

Każda tabela powinna mieć:
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
created_at TIMESTAMP DEFAULT now()
```

Opcjonalnie:
```sql
updated_at TIMESTAMP,  -- jeśli potrzebne
user_fingerprint TEXT  -- dla anonimowej identyfikacji
```

### 3. Walidacja na Poziomie Bazy

```sql
-- Użyj CHECK constraints
status TEXT NOT NULL CHECK (status IN ('stoi', 'toczy_sie', 'jedzie')),

-- Użyj NOT NULL dla wymaganych pól
street TEXT NOT NULL,

-- Użyj DEFAULT dla wartości domyślnych
reported_at TIMESTAMP NOT NULL DEFAULT now()
```

### 4. Indeksowanie

```sql
-- Indeksy na foreign keys
CREATE INDEX idx_table_fk ON table_name (foreign_key_id);

-- Composite indexes dla częstych zapytań
CREATE INDEX idx_traffic_reports_lookup
ON traffic_reports (street, direction, reported_at DESC);

-- Partial indexes dla optymalizacji
CREATE INDEX idx_active_coupons
ON coupons (status) WHERE status = 'active';
```

## Główne Tabele

### 1. traffic_reports (Raporty Ruchu)

**Cel:** Przechowuje zgłoszenia użytkowników o stanie ruchu na ulicach.

```sql
CREATE TABLE traffic_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  street TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('stoi', 'toczy_sie', 'jedzie')),
  direction TEXT NOT NULL CHECK (direction IN ('do centrum', 'od centrum')),
  speed NUMERIC,                    -- Prędkość w km/h z Google Routes API
  reported_at TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  user_fingerprint TEXT             -- Anonimowa identyfikacja użytkownika
);

-- Indeksy dla optymalizacji zapytań
CREATE INDEX idx_traffic_reports_lookup
ON traffic_reports (street, direction, reported_at DESC);

CREATE INDEX idx_traffic_reports_street
ON traffic_reports (street);

CREATE INDEX idx_traffic_reports_created
ON traffic_reports (created_at DESC);
```

**Queries Pattern:**
```typescript
// Fetch last 4 weeks for predictions
const { data } = await supabase
  .from('traffic_reports')
  .select('status, reported_at, direction')
  .eq('street', street)
  .eq('direction', direction)
  .gte('reported_at', fourWeeksAgo)
  .order('reported_at', { ascending: false })
  .limit(5000);
```

### 2. locations (Lokalizacje Biznesowe)

**Cel:** Przechowuje informacje o lokalach biznesowych dla kuponów.

```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  street TEXT,                      -- Ulica w Wrocławiu
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_locations_street ON locations (street);
```

### 3. coupons (Kupony Rabatowe)

**Cel:** System kuponów rabatowych dla lokalnych biznesów.

```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  local_name TEXT,
  discount NUMERIC NOT NULL,        -- Procent rabatu
  status TEXT NOT NULL CHECK (status IN ('active', 'redeemed', 'used', 'expired')),
  time_from TIMESTAMP NOT NULL,
  time_to TIMESTAMP,                -- NULL = bez wygaśnięcia
  image_link TEXT,                  -- Link do obrazka w Supabase Storage
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_coupons_status ON coupons (status);
CREATE INDEX idx_coupons_location ON coupons (location_id);

-- Partial index dla aktywnych kuponów
CREATE INDEX idx_active_coupons
ON coupons (status, time_from, time_to)
WHERE status = 'active';
```

**Status Flow:**
```
active → redeemed → used
          ↓
       expired
```

### 4. chat_messages (Wiadomości na Czacie)

**Cel:** Chat specyficzny dla każdej ulicy z rate limitingiem.

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  street TEXT NOT NULL,
  message TEXT NOT NULL,
  user_fingerprint TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_chat_street ON chat_messages (street, created_at DESC);
CREATE INDEX idx_chat_user ON chat_messages (user_fingerprint, created_at DESC);
```

**Rate Limiting:**
```sql
-- Edge Function sprawdza:
SELECT COUNT(*) FROM chat_messages
WHERE user_fingerprint = $1
  AND created_at >= NOW() - INTERVAL '1 hour';
-- Limit: 10 wiadomości/godzinę
```

### 5. street_votes (Głosowania na Ulice)

**Cel:** Głosowanie użytkowników na ulice do monitorowania.

```sql
CREATE TABLE street_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  street_name TEXT NOT NULL,
  user_fingerprint TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),

  -- Jeden głos na użytkownika na ulicę
  UNIQUE(street_name, user_fingerprint)
);

CREATE INDEX idx_street_votes_street ON street_votes (street_name);
CREATE INDEX idx_street_votes_created ON street_votes (created_at DESC);
```

### 6. incident_reports (Zgłoszenia Incydentów)

**Cel:** Zgłoszenia wypadków, robót drogowych, etc.

```sql
CREATE TABLE incident_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  street TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('accident', 'roadwork', 'closure', 'other')),
  description TEXT,
  user_fingerprint TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_incident_street ON incident_reports (street, created_at DESC);
CREATE INDEX idx_incident_type ON incident_reports (type);
```

### 7. carpooling_votes (Głosowania na Carpooling)

**Cel:** Koordynacja wspólnych przejazdów.

```sql
CREATE TABLE carpooling_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  street TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('do centrum', 'od centrum')),
  time_slot TEXT NOT NULL,          -- np. "07:00-08:00"
  user_fingerprint TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_carpooling_lookup
ON carpooling_votes (street, direction, time_slot);
```

### 8. donations (Donacje)

**Cel:** Płatności wspomagające projekt.

```sql
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount NUMERIC NOT NULL,
  payment_id TEXT,                  -- ID z systemu płatności
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_donations_status ON donations (status);
CREATE INDEX idx_donations_created ON donations (created_at DESC);
```

### 9. visits (Statystyki Wizyt)

**Cel:** Tracking wizyt na stronie.

```sql
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page TEXT,
  user_fingerprint TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_visits_page ON visits (page, created_at DESC);
CREATE INDEX idx_visits_created ON visits (created_at DESC);
```

## Relacje między Tabelami

```
locations (1) ←→ (N) coupons
  Jedna lokalizacja może mieć wiele kuponów

traffic_reports (standalone)
  Niezależna tabela, brak FK

chat_messages (standalone)
  Grupowane po street

street_votes (standalone)
  Agregowane po street_name

incident_reports (standalone)
  Powiązane tylko przez street (TEXT)
```

## Row Level Security (RLS)

### Podstawowa Konfiguracja

```sql
-- Enable RLS na wszystkich tabelach
ALTER TABLE traffic_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
-- ... etc dla wszystkich tabel

-- Policy: Wszyscy mogą czytać
CREATE POLICY "Allow public read access"
ON traffic_reports FOR SELECT
USING (true);

-- Policy: Wszyscy mogą dodawać
CREATE POLICY "Allow public insert"
ON traffic_reports FOR INSERT
WITH CHECK (true);
```

### Rate Limiting przez RLS

```sql
-- Przykład: Limit 10 wiadomości/godzinę
CREATE POLICY "Rate limit chat messages"
ON chat_messages FOR INSERT
WITH CHECK (
  (
    SELECT COUNT(*)
    FROM chat_messages
    WHERE user_fingerprint = NEW.user_fingerprint
      AND created_at >= NOW() - INTERVAL '1 hour'
  ) < 10
);
```

## Migracje

### Struktura Plików

```
supabase/migrations/
├── 20251023232911_initial_schema.sql
├── 20251025135145_add_speed_column.sql
├── 20251031105835_add_coupons.sql
└── ...
```

### Tworzenie Migracji

```bash
# Nowa migracja
npx supabase migration new add_feature_name

# Stosowanie migracji lokalnie
npx supabase db push

# Reset bazy (development only!)
npx supabase db reset
```

### Template Migracji

```sql
-- Migration: Add feature_name
-- Created: YYYY-MM-DD

-- Add new table
CREATE TABLE feature_name (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  column1 TEXT NOT NULL,
  column2 NUMERIC,
  created_at TIMESTAMP DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_feature_column1
ON feature_name (column1);

-- Enable RLS
ALTER TABLE feature_name ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Allow public read"
ON feature_name FOR SELECT
USING (true);

-- Add comments
COMMENT ON TABLE feature_name IS 'Description of what this table stores';
COMMENT ON COLUMN feature_name.column1 IS 'Description of column1';
```

## Generowanie Typów TypeScript

### Automatyczne Generowanie

```bash
# Generuj typy z lokalnej bazy
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Użycie w Kodzie

```typescript
import { Database } from '@/integrations/supabase/types';

// Type dla tabeli
type TrafficReport = Database['public']['Tables']['traffic_reports']['Row'];

// Type dla Insert
type TrafficReportInsert = Database['public']['Tables']['traffic_reports']['Insert'];

// Type dla Update
type TrafficReportUpdate = Database['public']['Tables']['traffic_reports']['Update'];
```

## Query Patterns

### 1. Time-Range Queries

```typescript
// Last 4 weeks
const fourWeeksAgo = new Date();
fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

const { data } = await supabase
  .from('traffic_reports')
  .select('*')
  .gte('reported_at', fourWeeksAgo.toISOString());
```

### 2. Aggregation Queries

```typescript
// Count by status
const { data } = await supabase
  .from('traffic_reports')
  .select('status', { count: 'exact' })
  .eq('street', street);
```

### 3. Complex Filters

```typescript
// Multiple conditions
const { data } = await supabase
  .from('coupons')
  .select('*')
  .eq('status', 'active')
  .gte('time_from', now)
  .or(`time_to.is.null,time_to.gte.${now}`);
```

## Optymalizacja

### 1. Select Only Needed Columns

```typescript
// ✓ Good
.select('id, status, reported_at')

// ✗ Bad
.select('*')
```

### 2. Use Limit

```typescript
// Always limit large queries
.limit(1000)
```

### 3. Proper Indexes

```sql
-- For this query:
SELECT * FROM traffic_reports
WHERE street = 'Borowska'
  AND direction = 'do centrum'
  AND reported_at >= '2025-01-01'
ORDER BY reported_at DESC;

-- Create this index:
CREATE INDEX idx_traffic_reports_optimized
ON traffic_reports (street, direction, reported_at DESC);
```

## Monitoring

### Slow Queries

```sql
-- Check pg_stat_statements
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Table Sizes

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Backup & Recovery

### Automatic Backups (Supabase)

- Daily automatic backups
- Point-in-time recovery (PITR) available
- 7-day retention (free tier)

### Manual Backup

```bash
# Export schema
npx supabase db dump -f schema.sql --schema public

# Export data
npx supabase db dump -f data.sql --data-only
```

## Best Practices Checklist

### Przed Stworzeniem Tabeli

- [ ] Nazwa tabeli w snake_case, liczba mnoga
- [ ] `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
- [ ] `created_at TIMESTAMP DEFAULT now()`
- [ ] NOT NULL dla wymaganych pól
- [ ] CHECK constraints dla walidacji
- [ ] Indeksy dla filtered/joined kolumn
- [ ] RLS enabled
- [ ] Policies zdefiniowane
- [ ] Comments dodane

### Przed Migracja

- [ ] Migracja testowana lokalnie
- [ ] Typy TypeScript wygenerowane
- [ ] Backward compatible (jeśli możliwe)
- [ ] Rollback plan przygotowany

---

**Ostatnia aktualizacja:** 12 grudnia 2025
**Total Tables:** 9 głównych
**Total Migrations:** 55+
**RLS:** Enabled na wszystkich tabelach
