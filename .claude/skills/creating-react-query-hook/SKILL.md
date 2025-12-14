---
name: creating-react-query-hook
description: Creates React Query hooks for data fetching with proper caching, error handling, and type safety. Use when fetching data from Supabase, creating custom data hooks, or implementing server state management patterns.
---

# Creating React Query Hooks

## Standard Hook Template

```typescript
// src/hooks/useTrafficReports.ts

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TrafficReport {
  id: string;
  street: string;
  status: string;
  direction: string;
  speed: number | null;
  reported_at: string;
}

interface UseTrafficReportsOptions {
  street: string;
  direction: string;
  enabled?: boolean;
}

export function useTrafficReports({
  street,
  direction,
  enabled = true
}: UseTrafficReportsOptions): UseQueryResult<TrafficReport[], Error> {
  return useQuery({
    queryKey: ['traffic-reports', street, direction],
    queryFn: async () => {
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const { data, error } = await supabase
        .from('traffic_reports')
        .select('id, street, status, direction, speed, reported_at')
        .eq('street', street)
        .eq('direction', direction)
        .gte('reported_at', fourWeeksAgo.toISOString())
        .order('reported_at', { ascending: false })
        .limit(5000);

      if (error) throw error;
      return data as TrafficReport[];
    },
    enabled: enabled && !!street && !!direction,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  });
}
```

## Mutation Hook Template

```typescript
// src/hooks/useSubmitTrafficReport.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubmitReportParams {
  street: string;
  status: string;
  direction: string;
  speed?: number;
}

export function useSubmitTrafficReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SubmitReportParams) => {
      const { data, error } = await supabase.functions.invoke('submit-traffic-report', {
        body: params
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success('Zgłoszenie wysłane!');

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['traffic-reports', variables.street, variables.direction]
      });
    },
    onError: (error) => {
      console.error('Submit error:', error);
      toast.error('Nie udało się zgłosić ruchu');
    }
  });
}
```

## Usage in Component

```typescript
import { useTrafficReports } from '@/hooks/useTrafficReports';
import { useSubmitTrafficReport } from '@/hooks/useSubmitTrafficReport';

function TrafficComponent({ street, direction }: Props) {
  const { data: reports, isLoading, error } = useTrafficReports({
    street,
    direction
  });

  const { mutate: submitReport, isLoading: isSubmitting } = useSubmitTrafficReport();

  const handleSubmit = (status: string) => {
    submitReport({ street, status, direction });
  };

  if (isLoading) return <div>Ładowanie...</div>;
  if (error) return <div>Błąd: {error.message}</div>;

  return (
    <div>
      <button onClick={() => handleSubmit('stoi')} disabled={isSubmitting}>
        Stoi
      </button>
    </div>
  );
}
```

## Best Practices

### Query Key Structure
```typescript
// Hierarchical keys for easy invalidation
['traffic-reports'] // All traffic reports
['traffic-reports', street] // Specific street
['traffic-reports', street, direction] // Specific direction
```

### Stale Time Configuration
```typescript
// Static data (rarely changes)
staleTime: Infinity, // Never refetch

// Semi-static (changes hourly)
staleTime: 60 * 60 * 1000, // 1 hour

// Dynamic (changes frequently)
staleTime: 2 * 60 * 1000, // 2 minutes

// Real-time
staleTime: 0, // Always refetch
```

### Enabled Option
```typescript
// Only fetch when parameters are valid
enabled: !!street && !!direction && isAuthenticated
```

## Checklist

- [ ] Unique queryKey with all parameters
- [ ] Proper TypeScript types for data
- [ ] Error handling (throw error in queryFn)
- [ ] Enabled logic for conditional fetching
- [ ] Appropriate staleTime
- [ ] Query invalidation in mutations
- [ ] Toast notifications for user feedback
