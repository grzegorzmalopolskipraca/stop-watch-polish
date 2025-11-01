// OneSignal integration utilities

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

/**
 * Wait for OneSignal to be fully initialized
 */
async function waitForOneSignal(timeoutMs: number = 5000): Promise<boolean> {
  console.log("Waiting for OneSignal initialization...");
  
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      if (window.OneSignal && typeof window.OneSignal.init === 'function') {
        console.log(`✅ OneSignal initialized after ${elapsed}ms`);
        clearInterval(checkInterval);
        resolve(true);
      } else if (elapsed >= timeoutMs) {
        console.error(`❌ OneSignal initialization timeout after ${elapsed}ms`);
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 100); // Check every 100ms
  });
}

/**
 * Initialize OneSignal and subscribe user to push notifications for a specific street
 */
export async function subscribeToOneSignal(street: string): Promise<boolean> {
  try {
    console.log("=== ONESIGNAL SUBSCRIPTION START ===");
    console.log("Street:", street);
    console.log("Timestamp:", new Date().toISOString());
    console.log("Current URL:", window.location.href);
    console.log("User Agent:", navigator.userAgent);
    
    // Step 1: Check if browser supports notifications
    console.log("Step 1: Checking browser notification support...");
    if (!("Notification" in window)) {
      const error = "❌ Browser doesn't support notifications";
      console.error(error);
      throw new Error(error);
    }
    console.log("✅ Browser supports notifications");

    // Step 2: Wait for OneSignal SDK to be ready (5 second timeout)
    console.log("Step 2: Waiting for OneSignal SDK (5s timeout)...");
    const isReady = await waitForOneSignal(5000);
    if (!isReady) {
      throw new Error("OneSignal SDK nie załadował się na czas. Odśwież stronę i spróbuj ponownie.");
    }
    console.log("✅ OneSignal SDK ready");

    // Step 3: Request notification permission
    console.log("Step 3: Requesting notification permission...");
    console.log("Current Notification.permission:", Notification.permission);
    console.log("OneSignal object methods:", Object.keys(window.OneSignal));
    console.log("OneSignal.Notifications methods:", window.OneSignal.Notifications ? Object.keys(window.OneSignal.Notifications) : "NOT AVAILABLE");
    
    const permission = await window.OneSignal.Notifications.requestPermission();
    console.log("Permission request result:", permission);
    console.log("Permission type:", typeof permission);
    
    if (!permission) {
      console.error("❌ Permission denied or failed");
      throw new Error("Notification permission denied");
    }
    console.log("✅ Permission granted");

    // Step 4: Subscribe to push notifications
    console.log("Step 4: Subscribing to push notifications...");
    console.log("OneSignal.User available:", !!window.OneSignal.User);
    console.log("OneSignal.User.PushSubscription available:", !!window.OneSignal.User?.PushSubscription);
    
    await window.OneSignal.User.PushSubscription.optIn();
    console.log("✅ Subscribed to push notifications");
    
    // Verify subscription
    const subscriptionState = window.OneSignal.User.PushSubscription.optedIn;
    console.log("Subscription state after optIn:", subscriptionState);

    // Step 5: Add street tag (using unique tag per street for multiple subscriptions)
    console.log("Step 5: Adding street tag...");
    const tagKey = `street_${street.replace(/\s+/g, '_')}`;
    console.log("Tag key to add:", tagKey);
    
    await window.OneSignal.User.addTag(tagKey, "true");
    console.log("✅ Street tag added:", tagKey);
    
    // Verify tag was added
    const tags = await window.OneSignal.User.getTags();
    console.log("All tags after adding:", tags);

    // Step 6: Save to local storage
    console.log("Step 6: Saving subscription status...");
    localStorage.setItem(`onesignal_subscribed_${street}`, "true");
    console.log("✅ Subscription status saved");
    
    console.log("=== ONESIGNAL SUBSCRIPTION COMPLETED SUCCESSFULLY ===");
    return true;
  } catch (error) {
    console.error("=== ONESIGNAL SUBSCRIPTION FAILED ===");
    console.error("Error:", error);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Unsubscribe from push notifications for a specific street
 */
export async function unsubscribeFromOneSignal(street: string): Promise<boolean> {
  try {
    console.log("=== ONESIGNAL UNSUBSCRIBE START ===");
    console.log("Street:", street);
    
    if (!window.OneSignal) {
      console.error("OneSignal not initialized");
      return false;
    }

    // Remove street-specific tag
    const tagKey = `street_${street.replace(/\s+/g, '_')}`;
    await window.OneSignal.User.removeTag(tagKey);
    console.log("✅ Street tag removed:", tagKey);
    
    // Clear local subscription status
    localStorage.removeItem(`onesignal_subscribed_${street}`);
    console.log("✅ Local storage cleared");
    
    console.log("=== ONESIGNAL UNSUBSCRIBE COMPLETED ===");
    return true;
  } catch (error) {
    console.error("=== ONESIGNAL UNSUBSCRIBE FAILED ===");
    console.error("Error unsubscribing from OneSignal:", error);
    return false;
  }
}

/**
 * Check if user is subscribed to push notifications for a specific street
 */
export function isOneSignalSubscribed(street: string): boolean {
  return localStorage.getItem(`onesignal_subscribed_${street}`) === "true";
}
