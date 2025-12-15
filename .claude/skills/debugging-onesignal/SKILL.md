---
name: debugging-onesignal
description: Diagnoses and fixes OneSignal push notification issues including subscription problems, missing tags, service worker errors, and notification delivery failures. Use when notifications don't work, subscriptions fail, or tags are missing.
---

# Debugging OneSignal Push Notifications

## Quick Diagnostic

Run in browser console:

```javascript
// Check OneSignal status
const status = {
  permission: Notification.permission,
  subscribed: await OneSignal.User.PushSubscription.optedIn,
  userId: await OneSignal.User.PushSubscription.id,
  tags: await OneSignal.User.getTags(),
  serviceWorker: await navigator.serviceWorker.getRegistrations()
};
console.log(JSON.stringify(status, null, 2));
```

## Common Issues & Fixes

### Issue 1: Not Receiving Notifications

**Check permission:**
```javascript
Notification.permission  // Should be "granted"
```

**Fix:**
1. Go to `/push` page
2. Click "Włącz powiadomienia"
3. Grant browser permission
4. Subscribe to street

### Issue 2: Missing Tags

**Check tags:**
```javascript
OneSignal.User.getTags().then(tags => console.log(tags));
// Should show: { street_borowska: "true", test_device: "true" }
```

**Fix:**
1. Go to `/push` page
2. Click "Sprawdź pełny status"
3. Auto-fix adds missing tags

### Issue 3: Service Worker Not Registered

**Check service worker:**
```javascript
navigator.serviceWorker.getRegistrations().then(regs =>
  console.log(regs)
);
```

**Fix:**
1. Verify `/public/OneSignalSDKWorker.js` exists
2. Clear service workers:
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(r => r.unregister());
});
```
3. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
4. Re-subscribe

### Issue 4: Wrong Tag Format

**Correct format:** `street_<name>` (lowercase, with prefix)

```typescript
// ✓ Correct
await OneSignal.User.addTag('street_borowska', 'true');

// ✗ Wrong
await OneSignal.User.addTag('Borowska', 'true');
await OneSignal.User.addTag('borowska', 'true');
```

**Use helper functions:**
```typescript
import { subscribeToStreet } from '@/utils/onesignal';
await subscribeToStreet('Borowska');  // Handles formatting
```

## Testing Notifications

### Send Test from Dashboard
1. Go to OneSignal Dashboard → Messages → New Push
2. Target: "Send to Particular Segment"
3. Add filter: "User Tag" → `street_borowska` → "equals" → "true"
4. Send

### Test Locally
```typescript
// In component
const testNotification = async () => {
  const { data } = await supabase.functions.invoke('send-push-notifications', {
    body: {
      street: 'Borowska',
      status: 'stoi',
      direction: 'do centrum'
    }
  });
  console.log('Test notification sent:', data);
};
```

## Known Behaviors

**Android Chrome shows "Linux armv8l"**
- This is EXPECTED, not a bug
- Filter by tags to find subscriptions in dashboard

## Checklist

- [ ] Browser permission granted
- [ ] OneSignal initialized (check console for `[OneSignal]` logs)
- [ ] Service worker registered at `/OneSignalSDKWorker.js`
- [ ] Tags have correct format: `street_<name>` lowercase
- [ ] User appears in OneSignal dashboard when filtering by tag
- [ ] Test notification sent successfully

## References

- Helper functions: `src/utils/onesignal.ts`
- Debug command: `.claude/commands/debug-onesignal.md`
- Full fix docs: Root folder documentation files
