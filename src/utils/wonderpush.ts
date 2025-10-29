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
      throw new Error("Browser doesn't support notifications");
    }

    // Check current permission status
    const currentPermission = Notification.permission;
    console.log("Current notification permission:", currentPermission);

    if (currentPermission === "denied") {
      console.error("Notification permission was previously denied");
      throw new Error("Notifications blocked. Please enable them in your browser settings (click the lock icon in the address bar)");
    }

    // Request notification permission if not already granted
    if (currentPermission !== "granted") {
      const permission = await Notification.requestPermission();
      console.log("Permission request result:", permission);
      
      if (permission !== "granted") {
        console.error("Notification permission denied by user");
        throw new Error("Notification permission denied");
      }
    }

    console.log("Notification permission granted, initializing WonderPush...");

    // Wait for WonderPush to be ready with timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("WonderPush initialization timeout"));
      }, 10000); // 10 second timeout

      window.WonderPush = window.WonderPush || [];
      window.WonderPush.push(() => {
        clearTimeout(timeout);
        console.log("WonderPush is ready");
        resolve();
      });
    });

    // Subscribe user to street-specific tag
    console.log("Subscribing to notifications for tag:", `street_${street}`);
    
    // Subscribe to notifications and wait for completion
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Subscription timeout"));
      }, 15000);

      window.WonderPush.push(["subscribeToNotifications", (error: any) => {
        clearTimeout(timeout);
        if (error) {
          console.error("Error subscribing to notifications:", error);
          reject(error);
        } else {
          console.log("Successfully subscribed to notifications");
          resolve();
        }
      }]);
    });

    // Set user properties
    await new Promise<void>((resolve) => {
      window.WonderPush.push(["putProperties", {
        string_street: street,
      }]);
      console.log("Set user properties for street:", street);
      resolve();
    });
    
    // Add tag and wait for completion
    await new Promise<void>((resolve, reject) => {
      window.WonderPush.push(["addTag", `street_${street}`, (error: any) => {
        if (error) {
          console.error("Error adding tag:", error);
          reject(error);
        } else {
          console.log("Successfully added tag:", `street_${street}`);
          resolve();
        }
      }]);
    });

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
