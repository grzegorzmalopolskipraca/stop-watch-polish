// OneSignal integration utilities

declare global {
  interface Window {
    OneSignal?: any;
  }
}

/**
 * Initialize OneSignal and subscribe user to push notifications for a specific street
 */
export async function subscribeToOneSignal(street: string): Promise<boolean> {
  try {
    console.log("=== ONESIGNAL SUBSCRIPTION START ===");
    console.log("Street:", street);
    console.log("Timestamp:", new Date().toISOString());
    
    // Step 1: Check if browser supports notifications
    console.log("Step 1: Checking browser notification support...");
    if (!("Notification" in window)) {
      const error = "❌ Browser doesn't support notifications";
      console.error(error);
      throw new Error(error);
    }
    console.log("✅ Browser supports notifications");

    // Step 2: Check if OneSignal SDK is loaded
    console.log("Step 2: Checking OneSignal SDK availability...");
    if (!window.OneSignal) {
      const error = "❌ OneSignal SDK not loaded";
      console.error(error);
      throw new Error("OneSignal SDK not loaded. Please refresh the page.");
    }
    console.log("✅ OneSignal SDK loaded");

    // Step 3: Request notification permission
    console.log("Step 3: Requesting notification permission...");
    const permission = await window.OneSignal.Notifications.requestPermission();
    console.log("Permission result:", permission);
    
    if (!permission) {
      throw new Error("Notification permission denied");
    }
    console.log("✅ Permission granted");

    // Step 4: Subscribe to push notifications
    console.log("Step 4: Subscribing to push notifications...");
    await window.OneSignal.User.PushSubscription.optIn();
    console.log("✅ Subscribed to push notifications");

    // Step 5: Add street tag (using unique tag per street for multiple subscriptions)
    console.log("Step 5: Adding street tag...");
    const tagKey = `street_${street.replace(/\s+/g, '_')}`;
    await window.OneSignal.User.addTag(tagKey, "true");
    console.log("✅ Street tag added:", tagKey);

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
