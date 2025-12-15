---
description: Create a new React component with proper structure
---

# Create New Component

Create a new React component following project conventions.

## Steps

1. **Ask for component details:**
   - Component name (PascalCase)
   - Component type (feature component vs UI component)
   - Props needed

2. **Create component file** in appropriate location:
   - Feature components: `src/components/ComponentName.tsx`
   - UI components: `src/components/ui/component-name.tsx`

3. **Follow standard structure:**

```typescript
// 1. Imports
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 2. Types/Interfaces
interface ComponentNameProps {
  street: string;
  direction: string;
  // ... other props
}

// 3. Component
export const ComponentName = ({ street, direction }: ComponentNameProps) => {
  // 3a. State hooks
  const [isLoading, setIsLoading] = useState(false);

  // 3b. Data fetching (React Query)
  const { data, isLoading: isQueryLoading } = useQuery({
    queryKey: ['unique-key', street, direction],
    queryFn: async () => {
      const { data } = await supabase
        .from('table_name')
        .select('*')
        .eq('street', street)
        .eq('direction', direction);
      return data;
    },
    enabled: !!street && !!direction
  });

  // 3c. Derived state (useMemo)
  const processedData = useMemo(() => {
    if (!data) return [];
    // Process data here
    return data.filter(/* ... */);
  }, [data]);

  // 3d. Event handlers
  const handleClick = () => {
    // Handle event
  };

  // 3e. Effects
  useEffect(() => {
    // Side effects
  }, [street, direction]);

  // 3f. Conditional rendering
  if (isQueryLoading) {
    return <div>Ładowanie...</div>;
  }

  if (!data || data.length === 0) {
    return <div>Brak danych</div>;
  }

  // 3g. Main render
  return (
    <Card className="p-4">
      <h3 className="text-lg font-bold mb-4">Tytuł komponentu</h3>
      <div className="space-y-2">
        {processedData.map((item) => (
          <div key={item.id} className="p-2 bg-gray-100 rounded">
            {/* Render item */}
          </div>
        ))}
      </div>
      <Button onClick={handleClick} className="mt-4">
        Akcja
      </Button>
    </Card>
  );
};
```

## Component Checklist

- [ ] Uses PascalCase naming (e.g., `TrafficLine.tsx`)
- [ ] Imports use `@/` path alias
- [ ] TypeScript interface for props
- [ ] React Query for data fetching (if needed)
- [ ] useMemo for expensive calculations
- [ ] useCallback for callbacks passed to children
- [ ] Polish text for all UI strings
- [ ] Mobile-responsive classes (e.g., `text-sm md:text-base`)
- [ ] Loading and error states handled
- [ ] Proper accessibility (ARIA labels if needed)

## Styling Guidelines

```tsx
// ✓ Mobile-first responsive
<div className="px-1 gap-2 md:px-4 md:gap-4">

// ✓ Traffic status colors (if applicable)
<div className="bg-traffic-stoi text-white">Stoi</div>
<div className="bg-traffic-toczy text-white">Toczy się</div>
<div className="bg-traffic-jedzie text-white">Jedzie</div>

// ✓ Consistent spacing
<Card className="p-4">
  <h3 className="text-lg font-bold mb-4">Title</h3>
  <div className="space-y-2">
    {/* Content */}
  </div>
</Card>
```

## If Creating UI Component (shadcn-ui style)

For UI components in `src/components/ui/`:

```typescript
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const componentVariants = cva(
  "base-classes",
  {
    variants: {
      variant: {
        default: "default-classes",
        secondary: "secondary-classes",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ComponentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof componentVariants> {}

const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        className={cn(componentVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Component.displayName = "Component";

export { Component, componentVariants };
```

## Testing the Component

1. **Import in parent:**
   ```typescript
   import { ComponentName } from "@/components/ComponentName";
   ```

2. **Use in JSX:**
   ```tsx
   <ComponentName street={selectedStreet} direction={direction} />
   ```

3. **Verify:**
   - Component renders correctly
   - Props are passed properly
   - Data fetching works
   - Responsive on mobile
   - No console errors

## Example: Traffic Timeline Component

```typescript
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

interface TrafficTimelineProps {
  street: string;
  direction: string;
}

export const TrafficTimeline = ({ street, direction }: TrafficTimelineProps) => {
  const { data: reports } = useQuery({
    queryKey: ['timeline', street, direction],
    queryFn: async () => {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data } = await supabase
        .from('traffic_reports')
        .select('reported_at, status')
        .eq('street', street)
        .eq('direction', direction)
        .gte('reported_at', oneDayAgo.toISOString())
        .order('reported_at', { ascending: true });

      return data || [];
    }
  });

  const timeline = useMemo(() => {
    // Process reports into hourly blocks
    const grouped = {};
    reports?.forEach(report => {
      const hour = new Date(report.reported_at).getHours();
      if (!grouped[hour]) grouped[hour] = [];
      grouped[hour].push(report.status);
    });

    return Array.from({ length: 24 }, (_, hour) => {
      const statuses = grouped[hour] || [];
      const majorityStatus = getMajorityStatus(statuses);
      return { hour, status: majorityStatus };
    });
  }, [reports]);

  return (
    <Card className="p-4">
      <h3 className="text-lg font-bold mb-4">Ruch w ciągu ostatnich 24h</h3>
      <div className="flex gap-1">
        {timeline.map(({ hour, status }) => (
          <div
            key={hour}
            className={`flex-1 h-12 rounded flex items-center justify-center text-xs text-white bg-traffic-${status}`}
          >
            {hour}:00
          </div>
        ))}
      </div>
    </Card>
  );
};

function getMajorityStatus(statuses: string[]): string {
  if (statuses.length === 0) return 'neutral';
  const counts = statuses.reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}
```

After creating the component, test it thoroughly and inform the user about usage and any important notes.
