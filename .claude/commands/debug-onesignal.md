---
description: Debug OneSignal push notification issues
---

# Debug OneSignal Push Notifications

Systematic debugging guide for OneSignal push notification issues.

## Common Issues to Check

### 1. Service Worker Status

```javascript
// Run in browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});
```

**Expected:** Should see OneSignalSDKWorker registered

**Fix if missing:**
- Verify `/public/OneSignalSDKWorker.js` exists
- Check index.html initialization (lines 40-168)

### 2. Subscription Status

```typescript
import { checkStreetSubscription } from "@/utils/onesignal";

const isSubscribed = await checkStreetSubscription("borowska");
console.log('[Debug] Subscription status:', isSubscribed);
```

**Expected:** `true` if subscribed

**Fix if false:**
- Check browser permissions
- Verify OneSignal init completed
- Re-subscribe using `/push` page

### 3. Check Tags

```javascript
// Run in browser console
OneSignal.User.getTags().then(tags => {
  console.log('[Debug] Current tags:', tags);
});
```

**Expected tags:**
- `test_device: "true"`
- `street_<streetname>: "true"` (lowercase)

**Fix if missing:**
- Navigate to `/push` page
- Click "Sprawdź pełny status" button
- Auto-fix will add missing tags

### 4. OneSignal Dashboard Check

1. Go to OneSignal Dashboard → Audience → Segments
2. Click "Filter by Tag"
3. Enter: `street_borowska` (or other street)
4. Check if user appears in results

**Known Behavior:**
- Android Chrome shows as "Linux armv8l" - **this is expected**
- Filter by tags to find specific subscriptions

### 5. Console Logs

Check browser console for `[OneSignal]` prefixed logs:

```
[OneSignal] Initialized
[OneSignal] Permission: granted
[OneSignal] User ID: xxx
[OneSignal] Tags: {...}
```

**Fix if errors:**
- Check AppID in index.html is correct
- Verify service worker path is correct
- Check browser supports push notifications

## Step-by-Step Debugging Process

1. **Open browser DevTools** (F12)
2. **Check Console** for OneSignal logs
3. **Check Application tab** → Service Workers
4. **Check Network tab** for OneSignal API calls
5. **Use `/push` page** diagnostic button
6. **Send test notification** from OneSignal dashboard

## Common Fixes

### Issue: Not receiving notifications

**Solution:**
1. Verify browser permissions granted
2. Check tags are set correctly
3. Ensure notification sent to correct tag
4. Test with manual notification from dashboard

### Issue: Subscription doesn't persist

**Solution:**
1. Verify service worker is registered
2. Ensure tags are added after subscription completes
3. Add delay between subscription and tag addition:
   ```typescript
   await OneSignal.Notifications.requestPermission();
   await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
   await OneSignal.User.addTag(`street_${street}`, "true");
   ```

### Issue: Android shows "Linux armv8l"

**Solution:** This is **expected behavior**, not a bug. Android Chrome subscriptions appear this way in the dashboard. Use tag filtering to find subscriptions.

## Debugging Checklist

- [ ] Service worker registered
- [ ] Browser permission granted
- [ ] OneSignal initialized (check console)
- [ ] Tags set correctly (lowercase, `street_` prefix)
- [ ] User appears in OneSignal dashboard
- [ ] Test notification sent successfully
- [ ] Notification received in browser

## Test Notification

Send test from OneSignal dashboard:
1. Go to Messages → New Push
2. Target: "Send to Particular Segment"
3. Add filter: "User Tag" → `street_borowska` → "equals" → "true"
4. Send

## Documentation References

- Full debugging guide: `NOTIFICATION_DEBUGGING_GUIDE.md`
- OneSignal fix summary: `ONESIGNAL_FIX_SUMMARY.md`
- Android-specific: `ANDROID_FIX.md`
- Helper functions: `src/utils/onesignal.ts`

After completing diagnostics, provide the user with findings and recommended fixes.
