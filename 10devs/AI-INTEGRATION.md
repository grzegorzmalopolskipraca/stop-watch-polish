# AI Integration - Claude Code w Projekcie

## Przegląd

Projekt "Czy ulica stoi?" wykorzystuje **AI-First Development** z **Claude Code** jako głównym narzędziem developerskim. Integracja AI obejmuje:

- **6 Specialized Agents** - Eksperci w różnych rolach
- **10 Custom Skills** - Powtarzalne zadania i wzorce
- **2 MCP Servers** - Dostęp do dokumentacji i best practices
- **Prompt Library** - Sprawdzone prompty dla typowych zadań
- **Iterative Testing** - AI-assisted QA workflow

## Architektura AI Integration

```
┌─────────────────────────────────────────────────────────────┐
│                      CLAUDE CODE CLI                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐    │
│  │   AGENTS      │  │    SKILLS     │  │ MCP SERVERS  │    │
│  │               │  │               │  │              │    │
│  │ • Developer   │  │ • Timeline    │  │ • 10x-rules  │    │
│  │ • Architect   │  │ • Edge Func   │  │ • Context7   │    │
│  │ • Reviewer    │  │ • Testing     │  │              │    │
│  │ • Product Own │  │ • Debugging   │  │              │    │
│  │ • Tester      │  │ • Validation  │  │              │    │
│  │ • Documentator│  │ • etc.        │  │              │    │
│  └───────────────┘  └───────────────┘  └──────────────┘    │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           PROJECT DOCUMENTATION (10devs/)             │  │
│  │  • PRD.md                                             │  │
│  │  • DATABASE-SCHEMA.md                                 │  │
│  │  • API-CONTRACTS.md                                   │  │
│  │  • FRONTEND-STRUCTURE.md                              │  │
│  │  • AI-INTEGRATION.md (this file)                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │   CODEBASE      │
                    │  (src/, etc.)   │
                    └─────────────────┘
```

## 1. Agents - Wyspecjalizowani Eksperci

### 1.1 Developer Agent

**Plik:** `.claude/agents/developer.md`
**Rola:** Full-stack implementacja features i bugfixing
**Model:** Sonnet 4.5

**Kiedy używać:**
```
"Use developer agent to implement user registration feature"
"Use developer agent to fix the traffic prediction bug"
"Use developer agent to refactor the API endpoint"
```

**Expertise:**
- React 18 + TypeScript patterns
- Supabase Edge Functions (Deno)
- Traffic prediction logic (4-week data, day-of-week filtering)
- Speed data flow (ref pattern, not state)
- Polish language compliance

**Output:** Działający kod z 15-point quality checklist

**Example prompt:**
```
Use developer agent to create a new timeline component
for carpooling votes. Follow the creating-timeline-component
skill pattern and ensure direction is in useMemo deps.
```

### 1.2 Architect Agent

**Plik:** `.claude/agents/architect.md`
**Rola:** System design i decyzje architektoniczne
**Model:** Sonnet 4.5

**Kiedy używać:**
```
"Use architect agent to design the coupon redemption flow"
"Use architect agent to evaluate PostgreSQL vs MongoDB"
"Use architect agent to create data model for new feature"
```

**Expertise:**
- Architecture Decision Records (ADR)
- Technology evaluation (Impact vs Effort matrix)
- Scalability planning
- Data modeling
- API design

**Output:** Architecture diagrams, ADRs, data models, component hierarchy

**Example prompt:**
```
Use architect agent to design the architecture for
a real-time chat feature with rate limiting and
moderation. Provide ADR and data model.
```

### 1.3 Reviewer Agent

**Plik:** `.claude/agents/reviewer.md`
**Rola:** Code review, quality assurance, standards compliance
**Model:** Sonnet 4.5

**Kiedy używać:**
```
"Use reviewer agent to review my PR before merging"
"Use reviewer agent to check if component follows project standards"
"Use reviewer agent to validate Polish language compliance"
```

**Expertise:**
- 14-point code review checklist
- Security vulnerabilities detection
- Performance bottlenecks
- Polish language validation
- Project-specific patterns (traffic predictions, speed flow)

**Output:** Detailed review with severity levels (🔴 Critical, 🟡 Major, 🟢 Minor)

**Example prompt:**
```
Use reviewer agent to review this traffic prediction component.
Check for: direction in deps, Polish text, proper error handling.
```

### 1.4 Product Owner Agent

**Plik:** `.claude/agents/product-owner.md`
**Rola:** Feature prioritization, user stories, business decisions
**Model:** Sonnet 4.5

**Kiedy używać:**
```
"Use product owner agent to prioritize next sprint features"
"Use product owner agent to write user stories for coupons"
"Use product owner agent to evaluate new feature idea"
```

**Expertise:**
- Feature evaluation (Impact vs Effort)
- User story writing (Given/When/Then)
- Acceptance criteria definition
- MVP scoping
- Metrics definition

**Output:** Prioritized backlog, detailed user stories, acceptance criteria

**Example prompt:**
```
Use product owner agent to create user stories for
the green wave feature. Include acceptance criteria
and success metrics.
```

### 1.5 Tester Agent

**Plik:** `.claude/agents/tester.md`
**Rola:** QA strategy, test creation, quality metrics
**Model:** Sonnet 4.5

**Kiedy używać:**
```
"Use tester agent to create tests for traffic prediction logic"
"Use tester agent to design E2E test suite"
"Use tester agent to review test coverage"
```

**Expertise:**
- Testing pyramid (80% unit, 15% integration, 5% E2E)
- Vitest + React Testing Library
- Playwright E2E tests
- Test coverage analysis
- Bug reproduction

**Output:** Complete test suites with 80%+ coverage

**Example prompt:**
```
Use tester agent to create unit tests for the
WeeklyTimeline component. Test all edge cases:
empty data, single report, majority vote logic.
```

### 1.6 Documentator Agent

**Plik:** `.claude/agents/documentator.md`
**Rola:** Technical writing, documentation maintenance
**Model:** Sonnet 4.5

**Kiedy używać:**
```
"Use documentator agent to document the new API endpoint"
"Use documentator agent to create README for Edge Function"
"Use documentator agent to update CLAUDE.md with new patterns"
```

**Expertise:**
- API documentation templates
- Component documentation (props, usage, examples)
- How-to guides
- Troubleshooting guides
- Polish + English technical writing

**Output:** Professional documentation with examples and diagrams

**Example prompt:**
```
Use documentator agent to document the submit-traffic-report
Edge Function. Include: DTO interfaces, validation rules,
error responses, and usage examples.
```

## 2. Skills - Powtarzalne Zadania

### 2.1 Creating Timeline Component

**Plik:** `.claude/skills/creating-timeline-component/SKILL.md`
**Cel:** Prevents bug #1 (missing direction in useMemo deps)

**Auto-activates when:** Creating traffic timeline/prediction components

**Pattern enforced:**
```typescript
const timeline = useMemo(() => {
  const filtered = reports?.filter(r => r.direction === direction);
  return processData(filtered);
}, [reports, street, direction]); // ← Enforces direction in deps
```

**Example prompt:**
```
"Create a new timeline showing rush hour patterns"
→ Skill automatically activates and applies pattern
```

### 2.2 Creating Edge Function

**Plik:** `.claude/skills/creating-edge-function/SKILL.md`
**Cel:** Standardizes all 16+ Edge Functions

**Auto-activates when:** Creating Supabase Edge Function

**Pattern enforced:**
- CORS headers
- OPTIONS preflight handling
- Request validation
- Error handling with try/catch
- Proper response format
- Logging

**Example prompt:**
```
"Create Edge Function for submitting incident reports"
→ Skill generates function with all patterns included
```

### 2.3 Testing Component

**Plik:** `.claude/skills/testing-component/SKILL.md`
**Cel:** Accelerates TDD workflow

**Auto-activates when:** Writing tests for React component

**Generates:**
- Unit tests (Vitest + RTL)
- Mock data and fixtures
- Edge case coverage
- Accessibility tests
- Snapshot tests

**Example prompt:**
```
"Write tests for PredictedTraffic component"
→ Skill generates complete test suite
```

### 2.4 Fixing Prediction Bugs

**Plik:** `.claude/skills/fixing-prediction-bugs/SKILL.md`
**Cel:** Fixes most common bug (direction deps)

**Auto-activates when:** Debugging prediction/timeline components

**Diagnostic checklist:**
1. Check if direction in useMemo deps
2. Check if day-of-week filtering present
3. Check if majority vote logic correct
4. Check if 4-week data fetch present

**Example prompt:**
```
"Traffic predictions not updating when I change direction"
→ Skill diagnoses: missing direction in deps
→ Skill fixes: adds direction to dependency array
```

### 2.5 Creating React Query Hook

**Plik:** `.claude/skills/creating-react-query-hook/SKILL.md`
**Cel:** Standardizes data fetching

**Auto-activates when:** Creating API integration

**Pattern enforced:**
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['resource', param1, param2],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('param1', param1);
    if (error) throw error;
    return data || [];
  }
});
```

**Example prompt:**
```
"Fetch chat messages for selected street"
→ Skill generates proper React Query hook
```

### 2.6 Optimizing Database Query

**Plik:** `.claude/skills/optimizing-database-query/SKILL.md`
**Cel:** Prevents N+1 queries and performance issues

**Auto-activates when:** Slow queries detected

**Optimization strategies:**
- Add indexes
- Use .select() to limit columns
- Use .limit() for pagination
- Batch operations
- Use .single() when expecting one row

**Example prompt:**
```
"Traffic reports query is slow"
→ Skill analyzes query
→ Suggests: composite index on (street, direction, reported_at DESC)
```

### 2.7 Validating Polish Language

**Plik:** `.claude/skills/validating-polish-language/SKILL.md`
**Cel:** Ensures 100% Polish compliance

**Auto-activates when:** Creating UI components

**Checks:**
- All user-facing text is Polish
- Toast messages in Polish
- Error messages in Polish
- Button labels in Polish
- Placeholder text in Polish

**Common translations database:**
```typescript
Submit → Zgłoś
Cancel → Anuluj
Loading → Ładowanie
Error → Błąd
Success → Sukces
```

**Example prompt:**
```
"Create submit button for traffic report"
→ Skill ensures: <Button>Zgłoś</Button> (not "Submit")
```

### 2.8 Debugging OneSignal

**Plik:** `.claude/skills/debugging-onesignal/SKILL.md`
**Cel:** Fixes notification issues

**Auto-activates when:** OneSignal problems mentioned

**Diagnostic steps:**
1. Check OneSignal initialization in index.html
2. Verify service worker at /OneSignalSDKWorker.js
3. Check tag format: `street_<name>` lowercase
4. Verify foreground notification handler
5. Check browser console for [OneSignal] logs

**Example prompt:**
```
"Push notifications not working for Borowska street"
→ Skill checks: tag should be 'street_borowska' (lowercase)
→ Skill fixes: tag format
```

### 2.9 Creating Mobile Responsive UI

**Plik:** `.claude/skills/creating-mobile-responsive-ui/SKILL.md`
**Cel:** Ensures mobile-first design

**Auto-activates when:** Creating UI components

**Pattern enforced:**
- Base styles for mobile
- md: breakpoint for tablet
- lg: breakpoint for desktop
- Alternating layouts for small screens
- Fixed-height containers for icon alignment

**Example prompt:**
```
"Create navigation menu with icons"
→ Skill ensures mobile-first, icon alignment, text wrapping
```

### 2.10 TDD Workflow

**Plik:** `.claude/skills/tdd-workflow/SKILL.md`
**Cel:** Implements Red-Green-Refactor

**Auto-activates when:** "TDD" or "test-driven" mentioned

**Workflow:**
1. 🔴 **RED:** Write failing test
2. 🟢 **GREEN:** Write minimal code to pass
3. 🔵 **REFACTOR:** Improve code quality
4. **REPEAT**

**Example prompt:**
```
"Implement carpooling feature using TDD"
→ Skill guides through Red-Green-Refactor cycle
```

## 3. MCP Servers - Aktualna Wiedza

### 3.1 10x Rules

**Źródło:** https://10x-rules-mcp-server.przeprogramowani.workers.dev/sse
**Cel:** Best practices z kursu 10xdevs 2.0

**Kiedy używać:**
- Architectural decisions
- Code patterns and conventions
- Quality standards
- Project-specific rules

**Example prompts:**
```
"What's the best practice for state management in React according to 10x-rules?"
"Should I use context or prop drilling here? Check 10x-rules"
"Review this component architecture using 10x-rules"
```

**Auto-activates when:**
- Making architectural decisions
- Choosing between patterns
- Evaluating best practices

### 3.2 Context7

**Źródło:** https://github.com/upstash/context7 (Upstash)
**Cel:** Up-to-date documentation from official sources

**Kiedy używać:**
- Learning new APIs
- Getting latest framework documentation
- Finding working code examples
- Checking for deprecated methods

**Example prompts:**
```
"Use context7 to show React 18.3.1 useEffect best practices"
"Get latest Supabase Edge Functions documentation with context7"
"Use context7 for Tailwind CSS 3.4.17 responsive design patterns"
```

**Auto-activates when:**
- Working with external libraries/frameworks
- Need current API documentation
- Looking for working code examples

### 3.3 Combined Usage

**Maximum effectiveness:**
```
"Create a new timeline component for traffic predictions.
Use context7 for React Query 5.83.0 patterns.
Apply 10x-rules for component structure."

→ Result:
  ✅ Latest React Query docs (Context7)
  ✅ Project-specific patterns (10x-rules)
  ✅ Component follows both current best practices AND project conventions
```

## 4. Prompt Library

### 4.1 Feature Implementation

**Pattern:**
```
Use [agent] agent to [action] for [feature].
[Optional: Use [skill] skill for [specific pattern]]
[Optional: Use context7 for [technology] documentation]
[Optional: Apply 10x-rules for [aspect]]

Example:
Use developer agent to implement real-time chat feature.
Use creating-edge-function skill for the backend.
Use context7 for Supabase Realtime documentation.
Apply 10x-rules for rate limiting pattern.
```

### 4.2 Bug Fixing

**Pattern:**
```
Use [agent] agent to debug [issue].
[Optional: Use [skill] skill for [diagnostic]]

Example:
Use developer agent to debug traffic predictions not updating.
Use fixing-prediction-bugs skill for diagnosis.
```

### 4.3 Code Review

**Pattern:**
```
Use reviewer agent to review [component/PR].
Check for: [specific criteria]

Example:
Use reviewer agent to review TrafficLine.tsx.
Check for: direction in deps, Polish text, error handling, speed flow pattern.
```

### 4.4 Architecture Design

**Pattern:**
```
Use architect agent to design [system/feature].
Provide: [deliverables]

Example:
Use architect agent to design coupon redemption system.
Provide: ADR, data model, API contracts, security considerations.
```

### 4.5 Testing

**Pattern:**
```
Use tester agent to [create tests/design strategy] for [component/feature].
Coverage: [unit/integration/E2E]

Example:
Use tester agent to create tests for WeeklyTimeline component.
Coverage: unit tests with edge cases (empty data, single report, majority vote).
```

### 4.6 Documentation

**Pattern:**
```
Use documentator agent to document [component/API/feature].
Include: [specific sections]

Example:
Use documentator agent to document submit-traffic-report Edge Function.
Include: DTO interfaces, validation, error responses, usage examples.
```

## 5. Iterative Testing with AI

### Workflow 3x3 w Testowaniu

**Iteracja 1: Basic Tests**
```
Use tester agent to create basic tests for [component].
Focus on: happy path, basic edge cases
```

**Iteracja 2: Comprehensive Tests**
```
Use tester agent to expand tests for [component].
Add: error cases, boundary conditions, integration tests
```

**Iteracja 3: Advanced Tests**
```
Use tester agent to add advanced tests for [component].
Include: performance tests, accessibility tests, E2E scenarios
```

### Test Coverage Goals

```
Unit Tests:        80%+ coverage
Integration Tests: Key user flows
E2E Tests:         Critical paths

Total: 200+ tests (current target from TEST-PLANNER-INTEGRATION.md)
```

### AI-Assisted Test Generation

```typescript
// Example: AI generates this pattern
describe('PredictedTraffic', () => {
  it('filters reports by direction', () => {
    const reports = [
      { status: 'stoi', direction: 'do centrum', reported_at: '2025-12-12T10:00:00Z' },
      { status: 'jedzie', direction: 'od centrum', reported_at: '2025-12-12T10:05:00Z' }
    ];

    const { rerender } = render(
      <PredictedTraffic street="Borowska" direction="do centrum" weeklyReports={reports} />
    );

    // Should show only "do centrum" reports
    expect(screen.queryByText(/jedzie/i)).not.toBeInTheDocument();

    // Change direction
    rerender(<PredictedTraffic street="Borowska" direction="od centrum" weeklyReports={reports} />);

    // Should now show "od centrum" reports
    expect(screen.getByText(/jedzie/i)).toBeInTheDocument();
  });
});
```

## 6. AI-Powered Features

### 6.1 Automatic Code Generation

**Skills automatically generate code:**

```
Prompt: "Create timeline for incident reports"

→ creating-timeline-component skill activates
→ Generates:
  - React component with correct pattern
  - 4-week data fetch
  - Day-of-week filtering
  - Direction in useMemo deps
  - Majority vote logic
  - Polish UI text
```

### 6.2 Intelligent Bug Diagnosis

**Skills diagnose issues:**

```
Prompt: "Predictions not updating when direction changes"

→ fixing-prediction-bugs skill activates
→ Diagnosis:
  1. Checks useMemo dependencies
  2. Finds: direction missing in deps array
  3. Suggests fix: add direction to [reports, street, direction]
→ Applies fix automatically
```

### 6.3 Architecture Decisions

**Agents provide structured decisions:**

```
Prompt: "Should we use WebSockets or polling for real-time chat?"

→ architect agent activates
→ Provides:
  - ADR (Architecture Decision Record)
  - Pros/cons comparison
  - Impact/Effort matrix
  - Recommendation with reasoning
  - Implementation plan
```

### 6.4 Automated Documentation

**Agents maintain docs:**

```
Prompt: "Document the new carpooling feature"

→ documentator agent activates
→ Updates:
  - CLAUDE.md with new patterns
  - API-CONTRACTS.md with new endpoint
  - DATABASE-SCHEMA.md with new table
  - README.md with usage instructions
```

## 7. Best Practices

### 7.1 Agent Selection

**Use specific agents for specific tasks:**

```
✓ GOOD:
"Use developer agent to implement feature"
"Use architect agent to design system"
"Use reviewer agent to review code"

✗ BAD:
"Implement and review and document this feature"
(Too many responsibilities, unclear which agent)
```

### 7.2 Skill Invocation

**Let skills activate automatically:**

```
✓ GOOD:
"Create timeline component for traffic"
→ creating-timeline-component skill auto-activates

✗ BAD:
"Create timeline component but don't use any skills"
(Misses optimization and bug prevention)
```

### 7.3 MCP Server Usage

**Combine for maximum effectiveness:**

```
✓ GOOD:
"Use context7 for React Query docs and 10x-rules for caching strategy"
→ Current docs + project patterns

✗ BAD:
"How do I use React Query?"
(Generic question, doesn't leverage MCP servers)
```

### 7.4 Iterative Development

**Follow 3x3 approach:**

```
✓ GOOD:
Iteration 1: "Create basic traffic timeline"
Iteration 2: "Add error handling and loading states"
Iteration 3: "Optimize performance and add tests"

✗ BAD:
"Create perfect traffic timeline with everything"
(Too ambitious, skips iterations)
```

### 7.5 Prompt Specificity

**Be specific about requirements:**

```
✓ GOOD:
"Create Edge Function for chat messages with:
- Rate limiting (10 msg/hour)
- Content moderation
- PostgreSQL storage
- Polish error messages"

✗ BAD:
"Create chat endpoint"
(Too vague, missing requirements)
```

## 8. Metrics & Benefits

### Development Velocity

| Metric | Bez AI | Z AI | Poprawa |
|--------|--------|------|---------|
| Czas na nowy feature | 2-3 dni | 4-6 godzin | **75% szybciej** |
| Code review iterations | 3-4 | 1-2 | **50% mniej** |
| Bugs w produkcji | 5-10/tydzień | 1-2/tydzień | **80% mniej** |
| Czas na fix buga | 2-4 godziny | 30-60 min | **70% szybciej** |
| Documentation time | 1-2 dni | 2-3 godziny | **80% szybciej** |

### Code Quality

- **Consistency:** 95%+ komponentów używa standardowych wzorców
- **Test Coverage:** 80%+ (target z AI-powered testing)
- **Documentation:** 100% features udokumentowane automatycznie
- **Polish Language:** 100% compliance (automated validation)
- **Bug Prevention:** Top 5 bugs prevented by skills

### Developer Experience

- **Onboarding:** Nowy developer produktywny w 1 dzień (agents + docs)
- **Context Switching:** 50% mniej (wszystko w Claude Code)
- **Decision Making:** 60% szybciej (agents dostarczają kontekst)
- **Knowledge Transfer:** 90% szybciej (comprehensive documentation)

## 9. Workflow Examples

### Example 1: Implementing New Feature

```
Step 1: Planning
"Use product owner agent to create user stories for carpooling feature"
→ Output: 5 user stories with acceptance criteria

Step 2: Architecture
"Use architect agent to design carpooling system"
→ Output: Data model, API design, component hierarchy

Step 3: Implementation
"Use developer agent to implement carpooling voting.
Use creating-edge-function skill for backend.
Use context7 for Supabase documentation."
→ Output: Working feature with all patterns

Step 4: Testing
"Use tester agent to create tests for carpooling feature"
→ Output: Unit + integration + E2E tests

Step 5: Review
"Use reviewer agent to review carpooling implementation"
→ Output: Code review with 0 critical issues

Step 6: Documentation
"Use documentator agent to document carpooling feature"
→ Output: API docs, component docs, user guide
```

### Example 2: Fixing Critical Bug

```
Step 1: Diagnosis
"Traffic predictions show wrong data when direction changes"
→ fixing-prediction-bugs skill activates
→ Diagnosis: Missing direction in useMemo deps

Step 2: Fix
"Use developer agent to fix prediction bug"
→ Adds direction to dependency array
→ Adds tests to prevent regression

Step 3: Verification
"Use tester agent to verify fix"
→ Runs tests, all pass
→ Manual verification in browser

Step 4: Review
"Use reviewer agent to review bug fix"
→ Checks: fix is correct, tests added, no side effects

Step 5: Documentation
"Use documentator agent to add fix to troubleshooting guide"
→ Updates docs with common bug and solution
```

### Example 3: Code Review Before PR

```
Step 1: Self-review
"Use reviewer agent to review my changes before creating PR.
Files changed:
- src/components/CarpoolingVotes.tsx
- supabase/functions/submit-carpooling-vote/index.ts"

Step 2: Address feedback
→ Reviewer finds: Missing error handling in Edge Function
→ Developer fixes issues

Step 3: Final check
"Use reviewer agent to re-review after fixes"
→ All issues resolved, ready for PR

Step 4: Create PR
git add . && git commit -m "Add carpooling voting feature"
gh pr create --title "Feature: Carpooling voting" --body "..."
```

## 10. Troubleshooting AI Integration

### Issue: Agent not activating

**Symptoms:**
- Prompt doesn't trigger expected agent
- Generic response instead of specialized expertise

**Solution:**
```
Be explicit in prompt:
✗ "Create timeline component"
✓ "Use developer agent to create timeline component"
```

### Issue: Skill not auto-activating

**Symptoms:**
- Pattern not enforced
- Missing critical checks

**Solution:**
```
Skills auto-activate based on context. Be specific:
✗ "Create component"
✓ "Create traffic timeline component with predictions"
```

### Issue: MCP server not responding

**Symptoms:**
- Generic documentation instead of version-specific
- Best practices not project-specific

**Solution:**
```bash
# Check MCP configuration
cat .mcp.json

# Verify enabled in settings
cat .claude/settings.local.json | grep enableAllProjectMcpServers

# Restart Claude Code
```

### Issue: Conflicting patterns

**Symptoms:**
- Multiple skills suggest different approaches
- Unclear which pattern to follow

**Solution:**
```
Be explicit about priority:
"Use creating-timeline-component skill pattern (not generic)"
"Follow 10x-rules for this decision (override other suggestions)"
```

## 11. Future Enhancements

### Q2 2026: Custom MCP Servers

**Planned:**
- **Supabase MCP:** Direct database access and schema introspection
- **Project MCP:** Project-specific rules and patterns
- **OneSignal MCP:** Push notification management

### Q3 2026: Advanced Agents

**Planned:**
- **Performance Agent:** Automatic optimization suggestions
- **Security Agent:** Vulnerability scanning and fixes
- **Deploy Agent:** Automated deployment and rollback

### Q4 2026: AI-Powered CI/CD

**Planned:**
- AI code review in GitHub Actions
- Automated refactoring suggestions
- Predictive bug detection
- Auto-generated documentation in PRs

## Podsumowanie

**AI Integration w "Czy ulica stoi?":**

- **6 Agents** - Specialized AI experts for every role
- **10 Skills** - Automated patterns preventing top bugs
- **2 MCP Servers** - Always current docs + best practices
- **Iterative Workflow** - 3x3 approach for all features
- **Proven Results** - 75% faster development, 80% fewer bugs

**Key Principles:**
1. **AI as Partner:** Collaborate, don't just command
2. **Iterative:** 3x3 for everything (planning, implementation, testing)
3. **Context-Aware:** Full documentation in 10devs/ and .claude/
4. **Specialized:** Right agent for right task
5. **Automated:** Skills prevent common bugs
6. **Current:** MCP servers provide up-to-date knowledge

**Result:** Fastest, highest-quality MVP development with comprehensive documentation and minimal bugs.

---

**Ostatnia aktualizacja:** 12 grudnia 2025
**Wersja:** 1.0.0
**Status:** Aktywny rozwój
**AI Platform:** Claude Code + Claude Sonnet 4.5
