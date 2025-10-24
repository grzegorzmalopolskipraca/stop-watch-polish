// WonderPush integration utilities

declare global {
  interface Window {
    WonderPush?: any[];
  }
}

/**
 * Initialize WonderPush and subscribe user to push notifications for a specific street
 */
export async function subscribeToWonderPush(street: string): Promise<boolean> {
  try {
    if (!("Notification" in window)) {
      console.error("Browser doesn't support notifications");
      return false;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.error("Notification permission denied");
      return false;
    }

    // Wait for WonderPush to be ready
    await new Promise<void>((resolve) => {
      window.WonderPush = window.WonderPush || [];
      window.WonderPush.push(() => {
        resolve();
      });
    });

    // Subscribe user to street-specific tag
    window.WonderPush.push(["subscribeToNotifications"]);
    window.WonderPush.push(["putProperties", {
      string_street: street,
    }]);
    window.WonderPush.push(["addTag", `street_${street}`]);

    console.log("Subscribed to WonderPush for street:", street);
    
    // Save subscription status locally
    localStorage.setItem(`wonderpush_subscribed_${street}`, "true");
    
    return true;
  } catch (error) {
    console.error("Error subscribing to WonderPush:", error);
    return false;
  }
}

/**
 * Unsubscribe from push notifications for a specific street
 */
export async function unsubscribeFromWonderPush(street: string): Promise<boolean> {
  try {
    if (!window.WonderPush) {
      console.error("WonderPush not initialized");
      return false;
    }

    // Remove street-specific tag
    window.WonderPush.push(["removeTag", `street_${street}`]);
    
    // Clear local subscription status
    localStorage.removeItem(`wonderpush_subscribed_${street}`);
    
    console.log("Unsubscribed from WonderPush for street:", street);
    return true;
  } catch (error) {
    console.error("Error unsubscribing from WonderPush:", error);
    return false;
  }
}

/**
 * Check if user is subscribed to push notifications for a specific street
 */
export function isWonderPushSubscribed(street: string): boolean {
  return localStorage.getItem(`wonderpush_subscribed_${street}`) === "true";
}
