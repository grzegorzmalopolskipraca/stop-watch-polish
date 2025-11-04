# Notification Debugging Guide

## Enhanced Logging Added

I've added comprehensive logging throughout the notification delivery pipeline to help diagnose why notifications aren't displaying.

---

## 🔍 What Was Added

### 1. **Service Worker Logs** (`public/OneSignalSDKWorker.js`)

The service worker now logs every stage of notification handling:

```
[SW] Service Worker script loading...
[SW] OneSignal SDK loaded
📦 [SW-Install] Service Worker installing...
✅ [SW-Activate] Service Worker activated!
🔔 [SW-Push] Push event received!
[SW-Push] Push data parsed: {...}
✅ [SW-Show] Notification SHOWN!
👆 [SW-Click] Notification clicked!
❌ [SW-Close] Notification closed
```

### 2. **OneSignal Event Listeners** (`index.html`)

Added listeners for ALL OneSignal notification events:

```
[OneSignal-Init] Starting initialization...
[OneSignal-Init] Current status: {...}
✅ [OneSignal-Init] Initialized successfully

🔔 [OneSignal-Notification] foregroundWillDisplay event triggered!
[OneSignal-Notification] Notification data: {...}
[OneSignal-Notification] Calling event.notification.display()...
✅ [OneSignal-Notification] Display called successfully

✅ [OneSignal-Notification] Notification DISPLAYED event!
👆 [OneSignal-Notification] Notification CLICKED!
❌ [OneSignal-Notification] Notification DISMISSED

🔐 [OneSignal-Permission] Permission changed!
🔄 [OneSignal-Subscription] Subscription changed: {...}
```

### 3. **Enhanced Status Check** (`src/pages/Push.tsx`)

The "Sprawdź pełny status" button now checks:

- Service Worker registration status
- Service Worker state (active/installing/waiting)
- Browser-level notification permission
- OneSignal subscription details
- All tags
- Platform and user agent info

### 4. **Browser Test Button** (`src/pages/Push.tsx`)

New "🧪 Test powiadomienia przeglądarki" button that:

- Bypasses OneSignal completely
- Tests browser-level notifications
- Helps identify if the issue is with OneSignal or the browser/OS

---

## 📋 Testing Steps

### Step 1: Test Browser-Level Notifications First

1. Click **"🧪 Test powiadomienia przeglądarki"** button
2. Grant permission if prompted
3. Check if notification appears

**Expected Logs:**
```
🧪 [TEST-BROWSER] Testing browser notification directly...
[TEST-BROWSER] Current permission: granted
[TEST-BROWSER] Creating test notification...
✅ [TEST-BROWSER] Notification shown!
✅ [TEST-BROWSER] Test notification created successfully
```

**What This Tells Us:**
- ✅ If notification appears → Browser notifications work, issue is with OneSignal
- ❌ If notification doesn't appear → Browser/OS level issue

---

### Step 2: Check Full Status

1. Click **"🔍 Sprawdź pełny status"** button
2. Open browser console (F12)
3. Look for the status output

**Expected Logs:**
```
🔍 [CHECK-STATUS] Checking subscription status...

📋 [CHECK-STATUS] Service Worker registration:
  found: true
  scope: "https://ejedzie.pl/"
  active: true

✅ [CHECK-STATUS] Active Service Worker state: "activated"
✅ [CHECK-STATUS] Active Service Worker URL: "https://ejedzie.pl/OneSignalSDKWorker.js"

🔐 [CHECK-STATUS] Browser notification permission: "granted"

📊 [CHECK-STATUS] Full Status:
  isPushSupported: true
  permission: "granted"
  optedIn: true
  id: "427a3759-bcb4-4b99-b20f-a5cfa333be07"
  token: "https://fcm.googleapis.com/fcm/send/..."
  tags: {
    test_device: "true",
    street_test_device: "true",
    registered_from: "/push"
  }
```

**Check For:**
- ✅ `permission: "granted"` - Should be "granted", not "default" or "denied"
- ✅ `optedIn: true` - Should be true
- ✅ Service Worker `active: true` - Must be active
- ✅ `street_test_device` tag present - Required for notifications

---

### Step 3: Subscribe to OneSignal

1. Click **"Włącz powiadomienia"**
2. Allow permissions in the browser prompt
3. Watch console logs

**Expected Logs:**
```
🔔 [REGISTER] Starting registration...
[REGISTER] Requesting notification permission...
🔐 [OneSignal-Permission] Permission changed!
[REGISTER] Permission result: true
[REGISTER] Opting in to push notifications...
🔄 [OneSignal-Subscription] Subscription changed: {...}
[REGISTER] Registration details: { id, token, ... }
[REGISTER] Tags added for identification: {...}
✅ [REGISTER] Successfully registered for push notifications
```

---

### Step 4: Send Test Notification

1. Enter message in text field
2. Click **"Wyślij powiadomienie"**
3. Watch console logs carefully

**Expected Logs (Complete Flow):**

#### When Notification is Sent:
```
📤 [SEND-PUSH] Sending push notification...
[SEND-PUSH] Message: To jest testowe powiadomienie push!
[SEND-PUSH] Response: { success: true, data: { recipients: 1 } }
✅ [SEND-PUSH] Push notification sent successfully
```

#### When Notification is Received:
```
🔔 [SW-Push] Push event received!
[SW-Push] Push data parsed: { ... }
```

#### When Notification Should Display:
```
🔔 [OneSignal-Notification] foregroundWillDisplay event triggered!
[OneSignal-Notification] Notification data: {
  title: "💬 Nowa wiadomość na test_device",
  body: "To jest testowe powiadomienie push!"
}
[OneSignal-Notification] Calling event.notification.display()...
✅ [OneSignal-Notification] Display called successfully
✅ [OneSignal-Notification] Notification DISPLAYED event!
✅ [SW-Show] Notification SHOWN!
```

#### If You Click the Notification:
```
👆 [OneSignal-Notification] Notification CLICKED!
👆 [SW-Click] Notification clicked!
[SW-Click] Found 1 client windows
[SW-Click] Focusing existing window: https://ejedzie.pl/push
```

---

## 🔴 Common Issues and What Logs Reveal

### Issue 1: Notification Not Received at All

**Symptom:** No `[SW-Push]` logs appear

**Possible Causes:**
- Service Worker not active
- Wrong subscription token
- OneSignal delivery failed

**Check:**
```
[CHECK-STATUS] Service Worker registration: { active: false }  ❌
```

**Solution:** Refresh page, check service worker in DevTools → Application → Service Workers

---

### Issue 2: Notification Received But Not Displayed

**Symptom:** You see `[SW-Push]` but no `foregroundWillDisplay` or `[SW-Show]`

**Possible Causes:**
- OneSignal SDK not handling notification
- Event listener not registered
- Permission denied

**Check:**
```
[CHECK-STATUS] Browser notification permission: "denied"  ❌
[CHECK-STATUS] permission: "default"  ❌
```

**Solution:**
- Check browser notification settings
- On desktop: Chrome Settings → Privacy and Security → Site Settings → Notifications
- On mobile: Android Settings → Apps → Chrome → Notifications

---

### Issue 3: `foregroundWillDisplay` Fires But Nothing Shows

**Symptom:** You see event trigger but no actual notification

**Logs:**
```
🔔 [OneSignal-Notification] foregroundWillDisplay event triggered!
[OneSignal-Notification] Calling event.notification.display()...
✅ [OneSignal-Notification] Display called successfully
❌ NO [SW-Show] or [Notification DISPLAYED] logs
```

**Possible Causes:**
- Browser silently blocking notifications
- Focus mode / Do Not Disturb enabled
- System notification settings

**Solution:**
- Test with "🧪 Test powiadomienia przeglądarki" button
- Check OS notification settings
- Try on different device/browser

---

### Issue 4: Permission is "default"

**Symptom:**
```
[CHECK-STATUS] permission: "default"
[CHECK-STATUS] optedIn: false
```

**Solution:** You haven't actually subscribed yet. Click "Włącz powiadomienia"

---

### Issue 5: Missing `street_test_device` Tag

**Symptom:**
```
[SEND-PUSH] Response: { errors: ["All included players are not subscribed"] }
```

**Check:**
```
📊 [CHECK-STATUS] Full Status:
  tags: {
    test_device: "true",
    // Missing: street_test_device  ❌
  }
```

**Solution:** Click "Sprawdź pełny status" - it will auto-add the missing tag

---

## 📱 Mobile-Specific Debugging

### Android Chrome

**Important Settings:**
1. **Android Settings** → **Apps** → **Chrome** → **Notifications** → Enable
2. **Chrome** → **Settings** → **Site settings** → **Notifications** → Allow for ejedzie.pl

**Android-Specific Requirement:**
- Android Chrome **requires** Service Worker's `showNotification()` method
- Direct `new Notification()` throws error: "Illegal constructor"
- The test button now automatically uses Service Worker method on Android

**Logs to Check:**
```
[TEST-BROWSER] Using Service Worker method: true  ✅
[TEST-BROWSER] Getting service worker registration...
[TEST-BROWSER] Service worker ready: true  ✅
[TEST-BROWSER] Calling registration.showNotification()...
✅ [TEST-BROWSER] Test notification sent via Service Worker
```

**Registration Logs:**
```
[REGISTER] Registration details: {
  userAgent: "... Android ...",
  platform: "Linux armv8l"  ✅ This is correct for Android
}
```

**Dashboard:**
- Device will show as "Linux armv8l" in OneSignal
- Filter by `test_device = true` to find it

---

### iOS Safari

**Limitations:**
- Web push only works on iOS 16.4+
- Requires "Add to Home Screen"
- Different permission flow

**Check:**
```
[CHECK-STATUS] isPushSupported: false  ❌
```

If false on iOS, web push isn't supported in your configuration.

---

## 🎯 Expected vs Actual

### ✅ Perfect Flow (What You Should See)

1. **Initialization:**
   - `[OneSignal-Init] Initialized successfully`

2. **Subscription:**
   - `[REGISTER] Successfully registered`
   - `permission: "granted"`
   - `optedIn: true`

3. **Send:**
   - `[SEND-PUSH] Push notification sent successfully`
   - `recipients: 1`

4. **Receive:**
   - `[SW-Push] Push event received!`

5. **Display:**
   - `[OneSignal-Notification] foregroundWillDisplay event triggered!`
   - `[OneSignal-Notification] Display called successfully`
   - `[SW-Show] Notification SHOWN!`

6. **Click (optional):**
   - `[OneSignal-Notification] Notification CLICKED!`
   - `[SW-Click] Notification clicked!`

---

## 🛠️ Developer Tools

### Chrome DevTools

1. **Console (F12):** See all logs
2. **Application Tab:**
   - Service Workers: Check registration
   - Storage → IndexedDB: OneSignal data
   - Storage → Local Storage: Check permissions
3. **Network Tab:** See API calls to OneSignal

### Service Worker Inspection

1. Open DevTools → Application → Service Workers
2. Check status: Should be "activated and is running"
3. Click "Update" to refresh service worker
4. Click "Unregister" to reset (then refresh page)

---

## 📊 Summary

With these enhanced logs, you can now:

1. ✅ **Verify browser support** - Test notifications bypass OneSignal
2. ✅ **Check service worker** - See registration and activation status
3. ✅ **Track notification flow** - From send → receive → display → click
4. ✅ **Identify bottlenecks** - See exactly where notifications stop
5. ✅ **Debug permissions** - See browser and OneSignal permission state
6. ✅ **Verify tags** - Ensure correct targeting tags are present

**Next Steps:**
1. Click "🧪 Test powiadomienia przeglądarki" to verify browser works
2. Click "🔍 Sprawdź pełny status" to see complete state
3. Subscribe with "Włącz powiadomienia"
4. Send test notification
5. Share console logs if issues persist

All logs are prefixed with emojis and clear tags to make debugging easier! 🎉
