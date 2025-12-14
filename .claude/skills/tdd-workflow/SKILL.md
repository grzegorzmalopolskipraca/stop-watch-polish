---
name: tdd-workflow
description: Implements Test-Driven Development (TDD) workflow by writing tests first, then implementing features to make tests pass. Use when developing new features, fixing bugs with test coverage, or ensuring code quality through TDD practice.
---

# Test-Driven Development Workflow

## TDD Cycle (Red-Green-Refactor)

```
1. RED    → Write failing test
2. GREEN  → Write minimal code to pass
3. REFACTOR → Improve code quality
4. REPEAT
```

## Step-by-Step TDD Workflow

### Step 1: Write Failing Test (RED)

```typescript
// src/utils/__tests__/calculateSpeed.test.ts

import { describe, it, expect } from 'vitest';
import { calculateSpeed } from '../calculateSpeed';

describe('calculateSpeed', () => {
  it('should calculate speed in km/h', () => {
    // distance: 1000m (1km), duration: 60s (1min)
    const speed = calculateSpeed(1000, 60);
    expect(speed).toBe(60); // 60 km/h
  });
});
```

Run test: `npm run test`
**Expected:** ❌ Test fails (function doesn't exist yet)

### Step 2: Write Minimal Code (GREEN)

```typescript
// src/utils/calculateSpeed.ts

export function calculateSpeed(distanceMeters: number, durationSeconds: number): number {
  // distance (m) / duration (s) = m/s
  // m/s * 3.6 = km/h
  return (distanceMeters / durationSeconds) * 3.6;
}
```

Run test: `npm run test`
**Expected:** ✅ Test passes

### Step 3: Refactor

Add edge cases:

```typescript
// Add more tests
it('should handle zero duration', () => {
  expect(calculateSpeed(1000, 0)).toBe(Infinity);
});

it('should handle zero distance', () => {
  expect(calculateSpeed(0, 60)).toBe(0);
});

it('should round to 2 decimals', () => {
  expect(calculateSpeed(1500, 90)).toBeCloseTo(60, 1);
});
```

Refactor implementation:

```typescript
export function calculateSpeed(distanceMeters: number, durationSeconds: number): number {
  if (durationSeconds === 0) return Infinity;
  if (distanceMeters === 0) return 0;

  const speedKmh = (distanceMeters / durationSeconds) * 3.6;
  return Math.round(speedKmh * 10) / 10; // Round to 1 decimal
}
```

### Step 4: Repeat for Next Feature

## Component TDD Example

### 1. Write Component Test

```typescript
// src/components/__tests__/TrafficStatus.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrafficStatus } from '../TrafficStatus';

describe('TrafficStatus', () => {
  it('should display "Stoi" for stopped status', () => {
    render(<TrafficStatus status="stoi" />);
    expect(screen.getByText('Stoi')).toBeInTheDocument();
  });

  it('should apply red background for stopped status', () => {
    render(<TrafficStatus status="stoi" />);
    const element = screen.getByText('Stoi');
    expect(element).toHaveClass('bg-traffic-stoi');
  });
});
```

**Run:** ❌ Fails (component doesn't exist)

### 2. Implement Component

```typescript
// src/components/TrafficStatus.tsx

interface TrafficStatusProps {
  status: 'stoi' | 'toczy_sie' | 'jedzie';
}

export const TrafficStatus = ({ status }: TrafficStatusProps) => {
  const labels = {
    stoi: 'Stoi',
    toczy_sie: 'Toczy się',
    jedzie: 'Jedzie'
  };

  return (
    <div className={`bg-traffic-${status} text-white p-2 rounded`}>
      {labels[status]}
    </div>
  );
};
```

**Run:** ✅ Passes

### 3. Refactor & Add More Tests

```typescript
it('should display "Toczy się" for slow status', () => {
  render(<TrafficStatus status="toczy_sie" />);
  expect(screen.getByText('Toczy się')).toBeInTheDocument();
});

it('should display "Jedzie" for flowing status', () => {
  render(<TrafficStatus status="jedzie" />);
  expect(screen.getByText('Jedzie')).toBeInTheDocument();
});
```

## TDD for Bug Fixes

### 1. Write Test That Reproduces Bug

```typescript
it('should include direction in useMemo dependencies', () => {
  // This test fails if direction is missing from dependencies
  const { rerender } = render(
    <Predictions street="Borowska" direction="do centrum" />
  );

  expect(screen.getByText(/do centrum/)).toBeInTheDocument();

  // Change direction
  rerender(<Predictions street="Borowska" direction="od centrum" />);

  // Should update to show new direction
  expect(screen.getByText(/od centrum/)).toBeInTheDocument();
});
```

**Run:** ❌ Fails if bug exists

### 2. Fix Bug

```typescript
const predictions = useMemo(() => {
  // ... logic
}, [reports, street, direction]); // ← Add direction
```

**Run:** ✅ Passes

## Benefits of TDD

1. **Better Design** - Tests force you to think about API first
2. **Confidence** - Know code works before deployment
3. **Documentation** - Tests show how code should be used
4. **Refactoring Safety** - Tests catch regressions
5. **Less Debugging** - Catch bugs early

## TDD Commands

```bash
# Watch mode (run tests on file change)
npm run test

# Run once
npm run test:ci

# Run specific test file
npm run test calculateSpeed

# Coverage report
npm run test:ci -- --coverage
```

## When to Use TDD

**Good for TDD:**
- Utility functions (pure logic)
- Complex business logic
- Bug fixes (write failing test first)
- Critical features (traffic predictions)

**Skip TDD for:**
- UI layout experiments
- Prototypes
- Simple CRUD operations
- Third-party integrations (mock instead)

## TDD Checklist

- [ ] Write failing test first (RED)
- [ ] Write minimal code to pass (GREEN)
- [ ] Refactor without breaking tests
- [ ] Add edge case tests
- [ ] Achieve desired coverage (80%+)
- [ ] Commit with passing tests
