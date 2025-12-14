---
name: optimizing-database-query
description: Optimizes Supabase database queries for performance by selecting specific columns, adding filters, using limits, and ensuring proper indexes. Use when queries are slow, fetching too much data, or causing performance issues.
---

# Optimizing Database Queries

## Before Optimization

```typescript
// ❌ Slow - fetches everything
const { data } = await supabase
  .from('traffic_reports')
  .select('*');
```

## After Optimization

```typescript
// ✓ Fast - optimized
const { data } = await supabase
  .from('traffic_reports')
  .select('id, status, reported_at')  // ← Only needed columns
  .eq('street', street)  // ← Filter in DB
  .eq('direction', direction)
  .gte('reported_at', startDate)
  .order('reported_at', { ascending: false })
  .limit(1000);  // ← Limit results
```

## Optimization Checklist

### 1. Select Specific Columns
```typescript
// Instead of .select('*')
.select('id, status, reported_at, direction')
```

### 2. Add Filters Early
```typescript
.eq('street', street)
.eq('direction', direction)
.gte('created_at', yesterday)
```

### 3. Limit Results
```typescript
.limit(1000)  // Adjust based on needs
```

### 4. Use Proper Ordering
```typescript
.order('reported_at', { ascending: false })  // Most recent first
```

### 5. Use Single for Single Row
```typescript
.single()  // When expecting one row
```

## Index Requirements

Ensure indexes exist for filtered columns:

```sql
-- Migration: add indexes
CREATE INDEX idx_traffic_reports_lookup
ON traffic_reports (street, direction, reported_at DESC);

CREATE INDEX idx_traffic_reports_street
ON traffic_reports (street);
```

## Common Patterns

### Time Range Query
```typescript
const oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

const { data } = await supabase
  .from('traffic_reports')
  .select('status, reported_at')
  .eq('street', street)
  .gte('reported_at', oneWeekAgo.toISOString())
  .limit(500);
```

### Count Query
```typescript
const { count } = await supabase
  .from('traffic_reports')
  .select('*', { count: 'exact', head: true })  // Only count, no data
  .eq('street', street);
```

### Pagination
```typescript
const { data } = await supabase
  .from('traffic_reports')
  .select('*')
  .range(0, 49);  // First 50 rows
```

## Performance Tips

- Select only columns you need
- Add filters before ordering
- Use `.limit()` always
- Enable RLS (Row Level Security)
- Create indexes for filtered columns
- Use `.single()` for single row queries
- Avoid `count: 'exact'` in large tables (use `estimated` instead)
