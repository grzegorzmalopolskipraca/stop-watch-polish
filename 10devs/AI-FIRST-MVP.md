# AI-First MVP Bootstrap - Podejście do Rozwoju Projektu

## Wprowadzenie

**"Czy ulica stoi?"** to projekt tworzony zgodnie z metodologią **AI-First MVP Bootstrap** z kursu 10xdevs 2.0. Dokument ten definiuje strukturę, standardy i najlepsze praktyki dla iteracyjnego rozwoju z wykorzystaniem AI.

## Filozofia AI-First

### Podstawowe Zasady

1. **AI jako Partner, Nie Narzędzie**
   - Claude Code to współpracownik, nie tylko generator kodu
   - Iteracyjne podejście: plan → implementacja → rewizja → poprawa
   - Dokumentacja jako kontekst dla AI

2. **Iteracyjny Rozwój 3x3**
   - 3 iteracje na feature
   - 3 punkty kontrolne (plan, implementacja, testy)
   - Szybkie feedback loops

3. **Kontekst > Instrukcje**
   - Pełna dokumentacja w `10devs/`
   - Pliki kontekstowe w `.claude/`
   - Skills i agents dla powtarzalnych zadań

## Struktura Projektu AI-First

```
stop-watch-polish/
├── 10devs/                     # 📚 Dokumentacja AI-First
│   ├── PRD.md                  # Product Requirements
│   ├── AI-FIRST-MVP.md         # Ten dokument
│   ├── DATABASE-SCHEMA.md      # Schemat bazy danych
│   ├── API-CONTRACTS.md        # Kontrakty API
│   ├── FRONTEND-STRUCTURE.md   # Struktura frontendu
│   ├── AI-INTEGRATION.md       # Integracja AI
│   └── ITERATIVE-WORKFLOW.md   # Workflow 3x3
│
├── .claude/                    # 🤖 Konfiguracja Claude Code
│   ├── agents/                 # Wyspecjalizowani agenci
│   ├── skills/                 # Powtarzalne zadania
│   ├── commands/               # Slash commands
│   └── context/                # Kontekst projektu
│
├── src/                        # 💻 Frontend (React + Vite)
│   ├── components/             # Komponenty UI
│   ├── pages/                  # Strony (routing)
│   ├── integrations/           # Integracje (Supabase, etc.)
│   ├── hooks/                  # Custom React hooks
│   └── utils/                  # Funkcje utility
│
├── supabase/                   # 🗄️ Backend (Supabase)
│   ├── migrations/             # Migracje SQL
│   └── functions/              # Edge Functions (API)
│
└── tests/                      # 🧪 Testy
    ├── unit/                   # Testy jednostkowe
    ├── integration/            # Testy integracyjne
    └── e2e/                    # Testy E2E
```

## Moduły AI-First MVP

### 1. Product Requirements Document (PRD)

**Plik:** `10devs/PRD.md`

**Zawartość:**
- ✅ Szczegółowy opis MVP
- ✅ Kluczowe funkcje (15 FR-1 do FR-15)
- ✅ User stories (15+ w 5 epikach)
- ✅ Workflow użytkownika
- ✅ Wymagania biznesowe
- ✅ Metryki sukcesu

**Cel:** Fundament i kontekst dla AI w iteracyjnym tworzeniu projektu

**Wykorzystanie przez AI:**
- Agent Product Owner czyta PRD przy planowaniu features
- Agent Architect weryfikuje zgodność z wizją produktu
- Agent Developer implementuje według user stories

### 2. Backend - PostgreSQL + Supabase

**Pliki:**
- `supabase/migrations/*.sql` - Migracje bazy danych
- `10devs/DATABASE-SCHEMA.md` - Dokumentacja schematu

**Reguły:**
1. **Spójność Schematu**
   - Wszystkie tabele mają `id UUID PRIMARY KEY`
   - Timestamps: `created_at`, `updated_at` (gdzie potrzebne)
   - Foreign keys z `ON DELETE` strategią

2. **Walidacja Typów**
   - Używaj ENUM dla stałych wartości (status, direction)
   - NOT NULL dla wymaganych pól
   - CHECK constraints dla walidacji

3. **Indeksowanie**
   - Indeksy na wszystkich foreign keys
   - Composite indexes dla częstych zapytań
   - Partial indexes dla optymalizacji

**Przykład migracji:**
```sql
-- migrations/001_create_traffic_reports.sql
CREATE TABLE traffic_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  street TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('stoi', 'toczy_sie', 'jedzie')),
  direction TEXT NOT NULL CHECK (direction IN ('do centrum', 'od centrum')),
  speed NUMERIC,
  reported_at TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  user_fingerprint TEXT
);

-- Indeksy dla optymalizacji
CREATE INDEX idx_traffic_reports_lookup
ON traffic_reports (street, direction, reported_at DESC);
```

### 3. REST API (Supabase Edge Functions)

**Pliki:**
- `supabase/functions/*/index.ts` - Implementacje endpoints
- `10devs/API-CONTRACTS.md` - Kontrakty DTO

**Reguły:**

**Iteracyjne Podejście 3x3:**
1. **Iteracja 1:** Podstawowa funkcjonalność (happy path)
2. **Iteracja 2:** Walidacja i error handling
3. **Iteracja 3:** Optymalizacja i edge cases

**Walidacja Request/Response:**
```typescript
// DTO dla request
interface SubmitTrafficReportRequest {
  street: string;
  status: 'stoi' | 'toczy_sie' | 'jedzie';
  direction: 'do centrum' | 'od centrum';
  speed?: number;
  user_fingerprint?: string;
}

// DTO dla response
interface SubmitTrafficReportResponse {
  success: boolean;
  data?: {
    id: string;
    reported_at: string;
  };
  error?: string;
}
```

**Oddzielenie Logiki:**
```typescript
// ✓ Correct - separacja warstw
serve(async (req) => {
  // 1. Transport layer - obsługa HTTP
  const body = await req.json();

  // 2. Validation layer - walidacja
  const validatedData = validateRequest(body);

  // 3. Business logic layer - logika biznesowa
  const result = await processTrafficReport(validatedData);

  // 4. Response layer - formatowanie odpowiedzi
  return formatResponse(result);
});
```

### 4. Frontend - React + Vite + Tailwind + shadcn/ui

**Pliki:**
- `src/components/*.tsx` - Komponenty UI
- `src/pages/*.tsx` - Strony aplikacji
- `10devs/FRONTEND-STRUCTURE.md` - Dokumentacja struktury

**Reguły:**

**Komponenty Modularne:**
```typescript
// Jeden komponent = jedna odpowiedzialność
// ✓ Good
<TrafficReport street={street} direction={direction} />

// ✗ Bad - zbyt wiele odpowiedzialności
<MasterComponent />
```

**Tailwind CSS:**
```tsx
// Mobile-first approach
<div className="px-1 gap-2 md:px-4 md:gap-4">
  <span className="text-xs md:text-base">Label</span>
</div>
```

**Integracja z Backend:**
```typescript
// Zawsze przez React Query
const { data, error } = useQuery({
  queryKey: ['traffic-reports', street, direction],
  queryFn: async () => {
    const { data } = await supabase
      .from('traffic_reports')
      .select('*')
      .eq('street', street);
    return data;
  }
});
```

### 5. Integracja AI

**Pliki:**
- `.claude/agents/*.md` - AI agents
- `.claude/skills/*.md` - AI skills
- `10devs/AI-INTEGRATION.md` - Dokumentacja integracji

**Wykorzystanie AI w Projekcie:**

**1. Code Generation:**
```
Developer agent + creating-timeline-component skill
  = Komponenty zgodne z wzorcem projektu
```

**2. Code Review:**
```
Reviewer agent + validating-polish-language skill
  = Automatyczna weryfikacja standardów
```

**3. Testing:**
```
Tester agent + testing-component skill
  = Kompletne testy jednostkowe i E2E
```

**4. Documentation:**
```
Documentator agent + context7 MCP
  = Dokumentacja z aktualnymi API
```

**Reguły:**

**Prompt Library:**
- Wykorzystuj skille dla powtarzalnych zadań
- Używaj agentów dla złożonych workflow
- MCP servers dla aktualnej dokumentacji

**Logika Biznesowa:**
```typescript
// AI pomaga wykraczać poza CRUD
// Przykład: Traffic prediction logic
const predictions = useMemo(() => {
  // 1. AI sugeruje algorytm
  // 2. Implementacja z walidacją
  // 3. Iteracyjne testowanie
  return calculatePredictions(reports, street, direction);
}, [reports, street, direction]);
```

## Workflow AI-First Development

### Standardowy Cykl Rozwoju

```
1. PLANNING (z Product Owner agent)
   ↓
   "Zdefiniuj user story dla nowego feature"
   → Agent tworzy szczegółową specyfikację

2. ARCHITECTURE (z Architect agent)
   ↓
   "Zaprojektuj architekturę dla tego feature"
   → Agent tworzy design z diagramami

3. IMPLEMENTATION (z Developer agent + Skills)
   ↓
   "Implementuj według specyfikacji"
   → Agent używa skills dla standardowych wzorców

4. TESTING (z Tester agent)
   ↓
   "Napisz testy dla implementacji"
   → Agent tworzy unit + integration + E2E tests

5. REVIEW (z Reviewer agent)
   ↓
   "Zrób code review przed commitem"
   → Agent weryfikuje zgodność ze standardami

6. DOCUMENTATION (z Documentator agent)
   ↓
   "Udokumentuj nowy feature"
   → Agent aktualizuje docs
```

### Iteracyjne Podejście 3x3

**Iteracja 1: MVP Feature**
- ✅ Podstawowa funkcjonalność (happy path)
- ✅ Minimalna walidacja
- ✅ Prosty test jednostkowy

**Iteracja 2: Production Ready**
- ✅ Pełna walidacja
- ✅ Error handling
- ✅ Testy integracyjne
- ✅ Edge cases

**Iteracja 3: Optimization**
- ✅ Performance tuning
- ✅ Security hardening
- ✅ Testy E2E
- ✅ Dokumentacja

## Best Practices AI-First

### 1. Dokumentacja jako Kod

```markdown
# Każdy feature ma:
- [ ] User story w PRD.md
- [ ] API contract w API-CONTRACTS.md
- [ ] Database schema w migrations/
- [ ] Component docs w FRONTEND-STRUCTURE.md
- [ ] Test plan w test files
```

### 2. Skills > Manual Coding

```
Zamiast pisać ręcznie:
  "Stwórz nowy komponent timeline"

Użyj skill:
  creating-timeline-component skill
  → Automatycznie stosuje wszystkie wzorce projektu
```

### 3. Agents > Ad-hoc Prompts

```
Zamiast:
  "Pomóż mi z tym bugiem"

Użyj agent:
  Reviewer agent + fixing-prediction-bugs skill
  → Systematyczne debugowanie według checklisty
```

### 4. MCP Servers dla Aktualności

```
Zamiast:
  "Jak używać React Query?"

Użyj MCP:
  "Use context7 for React Query 5.83.0 best practices"
  → Zawsze aktualna dokumentacja
```

## Metryki Sukcesu AI-First

### Development Velocity

| Metryka | Bez AI | Z AI | Poprawa |
|---------|--------|------|---------|
| Czas na nowy feature | 2-3 dni | 4-6 godzin | **75% szybciej** |
| Code review iterations | 3-4 | 1-2 | **50% mniej** |
| Bugs w produkcji | 5-10/tydzień | 1-2/tydzień | **80% mniej** |
| Czas na fix buga | 2-4 godziny | 30-60 min | **70% szybciej** |

### Code Quality

- **Consistency:** 95%+ komponentów używa standardowych wzorców
- **Test Coverage:** 80%+ (target z AI-powered testing)
- **Documentation:** 100% features udokumentowane automatycznie
- **Polish Language:** 100% compliance (automated validation)

### Team Efficiency

- **Onboarding:** Nowy developer produktywny w 1 dzień (agents + docs)
- **Context Switching:** 50% mniej (wszystko w Claude Code)
- **Decision Making:** 60% szybciej (agents dostarczają kontekst)

## Roadmap AI-First

### Q1 2026: Fundament
- ✅ Agents i skills podstawowe
- ✅ MCP servers (10x-rules, Context7)
- ✅ Dokumentacja AI-First
- ⏳ Pełne testy (Vitest + Playwright)

### Q2 2026: Zaawansowane
- 🔜 Custom MCP servers dla projektu
- 🔜 AI-powered monitoring i alerts
- 🔜 Automated performance optimization
- 🔜 Intelligent error handling

### Q3 2026: Automatyzacja
- 🔜 AI code review w CI/CD
- 🔜 Automated refactoring suggestions
- 🔜 Predictive bug detection
- 🔜 Auto-generated documentation

## Podsumowanie

Projekt **"Czy ulica stoi?"** jest przykładem **AI-First MVP Bootstrap**:

1. **Pełna dokumentacja** dla AI (10devs/, .claude/)
2. **Agents i Skills** dla standardowych zadań
3. **MCP Servers** dla aktualnej wiedzy
4. **Iteracyjny workflow** 3x3
5. **Metryki** pokazujące real-world benefits

**Rezultat:** Szybszy rozwój, lepsza jakość, mniej bugów, szczęśliwsi developerzy.

---

**Ostatnia aktualizacja:** 12 grudnia 2025
**Wersja:** 1.0.0
**Status:** Aktywny rozwój

## Referencje

- [PRD.md](./PRD.md) - Product Requirements
- [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md) - Schemat bazy danych
- [API-CONTRACTS.md](./API-CONTRACTS.md) - Kontrakty API
- [FRONTEND-STRUCTURE.md](./FRONTEND-STRUCTURE.md) - Struktura frontendu
- [AI-INTEGRATION.md](./AI-INTEGRATION.md) - Integracja AI
- [ITERATIVE-WORKFLOW.md](./ITERATIVE-WORKFLOW.md) - Workflow 3x3
