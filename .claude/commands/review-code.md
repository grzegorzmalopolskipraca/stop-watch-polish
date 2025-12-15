---
description: Review code changes before committing
---

# Review Code Changes

Perform a comprehensive code review before committing changes.

## Review Checklist

### 1. Polish Language Check

- [ ] All user-facing text is in Polish
- [ ] Button labels, notifications, error messages
- [ ] Route names follow Polish convention
- [ ] No English text visible to users

```tsx
// ✓ Correct
<Button>Zgłoś ruch</Button>
toast.success("Zgłoszenie wysłane!");

// ✗ Wrong
<Button>Submit Traffic</Button>
toast.success("Report submitted!");
```

### 2. Import Paths

- [ ] All imports use `@/` alias (not relative paths)
- [ ] No `../../` style imports

```typescript
// ✓ Correct
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// ✗ Wrong
import { Button } from "../../components/ui/button";
```

### 3. Type Safety

- [ ] Function parameters are typed
- [ ] Database types used where applicable
- [ ] No obvious `any` types (relaxed config allows them, but avoid when obvious)

```typescript
// ✓ Better
const handleClick = (status: "stoi" | "toczy_sie" | "jedzie") => {
  submitReport(status);
};

// ✓ Acceptable (relaxed config)
const handleClick = (status) => {
  submitReport(status);
};
```

### 4. React Query Usage

- [ ] All Supabase queries use React Query
- [ ] Query keys are unique and descriptive
- [ ] `enabled` option used when appropriate

```typescript
// ✓ Correct
const { data } = useQuery({
  queryKey: ['traffic-reports', street, direction],
  queryFn: async () => {
    const { data } = await supabase
      .from('traffic_reports')
      .select('*')
      .eq('street', street);
    return data;
  },
  enabled: !!street
});

// ✗ Wrong - using useState + useEffect
const [data, setData] = useState([]);
useEffect(() => {
  fetchData().then(setData);
}, []);
```

### 5. Memoization

- [ ] useMemo used for expensive calculations
- [ ] useCallback used for callbacks passed to children
- [ ] Dependencies arrays are correct and complete

```typescript
// ✓ Correct - includes all dependencies
const predictions = useMemo(() => {
  return calculatePredictions(reports, street, direction);
}, [reports, street, direction]); // ← All deps included

// ✗ Wrong - missing direction
const predictions = useMemo(() => {
  return calculatePredictions(reports, street, direction);
}, [reports, street]); // ← Missing direction!
```

### 6. Traffic Prediction Logic

- [ ] Fetches 4 weeks of data (28 days)
- [ ] Filters by day of week
- [ ] Filters by direction
- [ ] `direction` in useMemo dependencies
- [ ] Uses majority vote for intervals

```typescript
// ✓ Correct pattern
const relevantReports = reports?.filter((r) => {
  const reportDate = new Date(r.reported_at);
  return reportDate.getDay() === todayDayOfWeek && r.direction === direction;
});
```

### 7. Speed Data Flow

- [ ] Speed from TrafficLine propagated via onSpeedUpdate
- [ ] currentSpeedRef used (not just state)
- [ ] Speed included in submitReport
- [ ] Debug logs with [SpeedFlow] prefix (remove before commit)

```typescript
// ✓ Correct - using ref
const currentSpeedRef = useRef<number | null>(null);

const handleSpeedUpdate = (speed: number) => {
  currentSpeedRef.current = speed;
  setLastKnownSpeed(speed);
};

const submitReport = async (status: string) => {
  const speed = currentSpeedRef.current; // ← Read from ref
  // ... submit with speed
};
```

### 8. OneSignal Integration

- [ ] Tag format: `street_<streetname>` (lowercase)
- [ ] Helper functions from `@/utils/onesignal.ts`
- [ ] Service worker exists at `/public/OneSignalSDKWorker.js`
- [ ] No direct tag manipulation (use helpers)

```typescript
// ✓ Correct
import { subscribeToStreet } from "@/utils/onesignal";
await subscribeToStreet("borowska");

// ✗ Wrong
await OneSignal.User.addTag("borowska", "true"); // Wrong format!
```

### 9. Mobile Responsiveness

- [ ] Mobile-first Tailwind classes
- [ ] Fixed heights for icon alignment (`h-8 flex items-center`)
- [ ] Responsive text sizes (`text-sm md:text-base`)
- [ ] Touch-friendly button sizes

```tsx
// ✓ Correct - mobile first
<div className="px-1 gap-2 md:px-4 md:gap-4">
  <span className="text-xs md:text-base">Label</span>
</div>

// ✓ Icon alignment
<div className="h-8 flex items-center">
  <Icon className="flex-shrink-0" />
  <span>Label that might wrap</span>
</div>
```

### 10. Error Handling

- [ ] Supabase errors checked
- [ ] User-friendly error messages (Polish)
- [ ] Loading states handled
- [ ] Empty states handled

```typescript
// ✓ Correct
const { data, error } = await supabase
  .from('traffic_reports')
  .insert({ /* ... */ });

if (error) {
  console.error('Failed to submit:', error);
  toast.error('Nie udało się zgłosić ruchu');
  return;
}

toast.success('Zgłoszenie wysłane!');
```

### 11. Database Queries

- [ ] Filters applied (street, direction, date range)
- [ ] Select only needed columns
- [ ] Use `.limit()` where appropriate
- [ ] Order specified when needed

```typescript
// ✓ Optimized
const { data } = await supabase
  .from('traffic_reports')
  .select('id, status, reported_at') // ← Only needed columns
  .eq('street', street) // ← Filter in DB
  .eq('direction', direction)
  .gte('reported_at', startDate)
  .order('reported_at', { ascending: false })
  .limit(1000); // ← Limit results

// ✗ Not optimized
const { data } = await supabase
  .from('traffic_reports')
  .select('*'); // ← Everything!
```

### 12. Code Cleanliness

- [ ] No commented-out code (remove or document why)
- [ ] No console.logs left in production code
- [ ] No hardcoded credentials/secrets
- [ ] Meaningful variable names

```typescript
// ✗ Remove before commit
console.log('test');
// const oldCode = () => { /* ... */ };
const x = getData(); // What is x?

// ✓ Clean code
const trafficReports = getData();
```

### 13. Environment Variables

- [ ] No hardcoded URLs or API keys
- [ ] Use `import.meta.env.VITE_*`
- [ ] .env file not committed

```typescript
// ✓ Correct
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// ✗ Wrong
const supabaseUrl = "https://xxx.supabase.co"; // Hardcoded!
```

### 14. File Naming

- [ ] Components: PascalCase.tsx
- [ ] Utils/hooks: camelCase.ts
- [ ] Pages: PascalCase.tsx

```
✓ src/components/TrafficLine.tsx
✓ src/utils/onesignal.ts
✓ src/pages/Index.tsx

✗ src/components/traffic-line.tsx
✗ src/utils/OneSignal.ts
```

## Automated Checks

Run these commands before committing:

```bash
# 1. TypeScript check
npm run type-check

# 2. ESLint
npm run lint

# 3. Build check
npm run build

# 4. Tests (when implemented)
npm run test:ci
```

## Git Commit Checklist

- [ ] Meaningful commit message
- [ ] Follows format: `<type>: <description>`
- [ ] Includes Co-Authored-By footer
- [ ] No sensitive data (check with `git diff`)

```bash
# Good commit message format
git commit -m "$(cat <<'EOF'
feat: Add traffic prediction for next hour

Implements 5-minute interval predictions based on historical data.
Includes day-of-week filtering and majority vote logic.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

## Common Issues to Check

### Issue: Predictions showing wrong data
- Check: `direction` in useMemo dependencies?
- Check: Direction filtering in data fetch?

### Issue: OneSignal not working
- Check: Service worker file exists?
- Check: Tags format (lowercase, `street_` prefix)?
- Check: index.html initialization?

### Issue: Speed not saving
- Check: Using currentSpeedRef (not just state)?
- Check: Speed included in submitReport body?

### Issue: Mobile layout broken
- Check: Mobile-first classes?
- Check: Fixed heights for icon alignment?
- Check: Responsive text sizes?

## Final Review Steps

1. **Read through your changes:**
   ```bash
   git diff
   ```

2. **Check files to be committed:**
   ```bash
   git status
   ```

3. **Run automated checks:**
   ```bash
   npm run type-check && npm run lint && npm run build
   ```

4. **Test locally:**
   - Open app in browser
   - Test changed functionality
   - Check mobile view (DevTools)
   - Verify no console errors

5. **Review against checklist** (above)

6. **Commit with proper message**

## After Commit

- [ ] Push to GitHub
- [ ] Check GitHub Actions CI status
- [ ] Verify build passes
- [ ] Test on staging/production (if applicable)

## Need Help?

- Coding rules: `.claude/rules.md`
- Architecture: `.claude/architecture.md`
- Use cases: `.claude/use-cases.md`
- Main guide: `CLAUDE.md`

After review, either:
1. **Approve** - Code is ready to commit
2. **Request changes** - List issues that need fixing
3. **Suggest improvements** - Optional enhancements
