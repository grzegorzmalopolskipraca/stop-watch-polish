---
description: Add a new street to traffic monitoring
---

# Add New Street

Add a new street to the traffic monitoring system.

## Steps to Complete

1. **Ask for street name** - Get the name from the user
2. **Update STREETS array** in `src/pages/Index.tsx`:
   - Add the street name to the array
   - Ensure array is sorted alphabetically
3. **Verify the changes**:
   - The street should appear in the dropdown
   - Reports for the new street should work
   - OneSignal tags should be created automatically (`street_<streetname>`)

## Important Notes

- Street names should be capitalized (e.g., "Krzywoustego")
- No database migration needed - streets are stored as text
- OneSignal tags are created automatically on first subscription
- Format: lowercase with no spaces for tags (e.g., `street_krzywoustego`)

## Testing Checklist

- [ ] Street appears in dropdown selector
- [ ] Can submit traffic report for new street
- [ ] Direction filters work correctly
- [ ] OneSignal subscription creates correct tag
- [ ] Predictions load for the new street

## Example Code

```typescript
const STREETS = [
  "Borowska",
  "Buforowa",
  // ... existing streets ...
  "Krzywoustego", // ← New street here
  "Zwycięska"
].sort();
```

After completing these steps, verify the street works correctly and inform the user about the successful addition.
