---
name: testing-component
description: Creates Vitest unit and integration tests for React components with React Testing Library, React Query mocking, and Supabase client mocking. Use when writing tests for components, testing data fetching, form submissions, or user interactions.
---

# Testing React Components

## Component Test Template

```typescript
// src/components/__tests__/[ComponentName].test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { [ComponentName] } from '../[ComponentName]';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [{ id: '1', status: 'stoi', reported_at: '2025-01-15T10:00:00Z' }],
            error: null
          }))
        }))
      }))
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: { success: true }, error: null }))
    }
  }
}));

describe('[ComponentName]', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should render loading state initially', () => {
    render(<[ComponentName] street="Borowska" direction="do centrum" />, { wrapper });
    expect(screen.getByText(/ładowanie/i)).toBeInTheDocument();
  });

  it('should display data after loading', async () => {
    render(<[ComponentName] street="Borowska" direction="do centrum" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/stoi/i)).toBeInTheDocument();
    });
  });

  it('should handle error state', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: null, error: { message: 'Network error' } })
        })
      })
    } as any);

    render(<[ComponentName] street="Borowska" direction="do centrum" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/błąd/i)).toBeInTheDocument();
    });
  });
});
```

## Testing Patterns

### Pattern 1: Testing Data Fetching

```typescript
it('should fetch traffic reports with correct parameters', async () => {
  const { supabase } = await import('@/integrations/supabase/client');

  render(<TrafficReport street="Borowska" direction="do centrum" />, { wrapper });

  await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith('traffic_reports');
  });

  // Verify query parameters
  const fromCall = vi.mocked(supabase.from).mock.results[0].value;
  expect(fromCall.select).toHaveBeenCalled();
});
```

### Pattern 2: Testing User Interactions

```typescript
it('should call onSubmit when button clicked', async () => {
  const onSubmit = vi.fn();

  render(<ReportButton status="stoi" onSubmit={onSubmit} />, { wrapper });

  const button = screen.getByRole('button', { name: /stoi/i });
  fireEvent.click(button);

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith('stoi');
  });
});
```

### Pattern 3: Testing Form Submission

```typescript
it('should submit form with valid data', async () => {
  const { supabase } = await import('@/integrations/supabase/client');

  render(<ChatForm street="Borowska" />, { wrapper });

  const input = screen.getByPlaceholderText(/wpisz wiadomość/i);
  const submitButton = screen.getByRole('button', { name: /wyślij/i });

  fireEvent.change(input, { target: { value: 'Test message' } });
  fireEvent.click(submitButton);

  await waitFor(() => {
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'submit-chat-message',
      expect.objectContaining({
        body: expect.objectContaining({ message: 'Test message' })
      })
    );
  });
});
```

## Testing Utilities

### Mock Data Helpers

```typescript
// test/helpers/mockData.ts

export const mockTrafficReport = {
  id: '123',
  street: 'Borowska',
  status: 'stoi',
  direction: 'do centrum',
  speed: 15,
  reported_at: '2025-01-15T10:00:00Z'
};

export const mockTrafficReports = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    ...mockTrafficReport,
    id: `${i}`,
    reported_at: new Date(Date.now() - i * 60000).toISOString()
  }));
```

## Run Tests

```bash
# Watch mode
npm run test

# CI mode
npm run test:ci

# With coverage
npm run test:ci -- --coverage
```

## Checklist

- [ ] Test renders without crashing
- [ ] Test loading state
- [ ] Test error state
- [ ] Test empty data state
- [ ] Test successful data display
- [ ] Test user interactions
- [ ] Test form validation
- [ ] Mock external dependencies
- [ ] Clean up mocks in beforeEach
