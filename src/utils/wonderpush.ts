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
    console.log("=== WONDERPUSH SUBSCRIPTION START ===");
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

    // Step 2: Check current permission status
    console.log("Step 2: Checking notification permission...");
    const currentPermission = Notification.permission;
    console.log("Current permission:", currentPermission);

    if (currentPermission === "denied") {
      const error = "❌ Notification permission was DENIED. Go to browser settings (lock icon in address bar) and allow notifications for this site.";
      console.error(error);
      throw new Error("Notifications blocked. Please enable them in your browser settings (click the lock icon in the address bar)");
    }
    console.log("✅ Permission not denied");

    // Step 3: Request notification permission if needed
    if (currentPermission !== "granted") {
      console.log("Step 3: Requesting notification permission...");
      const permission = await Notification.requestPermission();
      console.log("Permission request result:", permission);
      
      if (permission !== "granted") {
        const error = "❌ User denied notification permission";
        console.error(error);
        throw new Error("Notification permission denied");
      }
      console.log("✅ Permission granted by user");
    } else {
      console.log("Step 3: Permission already granted, skipping request");
    }

    // Step 4: Initialize WonderPush
    console.log("Step 4: Initializing WonderPush SDK...");
    console.log("WonderPush global object exists:", !!window.WonderPush);
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const error = "❌ WonderPush initialization timeout (10s)";
        console.error(error);
        reject(new Error("WonderPush initialization timeout - SDK may not be loaded"));
      }, 10000);

      window.WonderPush = window.WonderPush || [];
      console.log("WonderPush queue length:", window.WonderPush.length);
      
      window.WonderPush.push(() => {
        clearTimeout(timeout);
        console.log("✅ WonderPush SDK is ready");
        resolve();
      });
    });

    // Step 5: Subscribe to notifications
    console.log("Step 5: Subscribing to WonderPush notifications...");
    console.log("Target tag:", `street_${street}`);
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const error = "❌ Subscription timeout (15s) - WonderPush may not be properly configured";
        console.error(error);
        reject(new Error(error));
      }, 15000);

      window.WonderPush.push(["subscribeToNotifications", (error: any) => {
        clearTimeout(timeout);
        if (error) {
          console.error("❌ WonderPush subscribeToNotifications error:", error);
          console.error("Error details:", JSON.stringify(error, null, 2));
          reject(new Error(`Subscription failed: ${error.message || error}`));
        } else {
          console.log("✅ Successfully subscribed to WonderPush notifications");
          resolve();
        }
      }]);
    });

    // Step 6: Set user properties
    console.log("Step 6: Setting user properties...");
    await new Promise<void>((resolve) => {
      window.WonderPush.push(["putProperties", {
        string_street: street,
      }]);
      console.log("✅ User properties set for street:", street);
      resolve();
    });
    
    // Step 7: Add street tag
    console.log("Step 7: Adding street tag...");
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const error = "❌ Add tag timeout (10s)";
        console.error(error);
        reject(new Error(error));
      }, 10000);

      window.WonderPush.push(["addTag", `street_${street}`, (error: any) => {
        clearTimeout(timeout);
        if (error) {
          console.error("❌ Error adding tag:", error);
          console.error("Error details:", JSON.stringify(error, null, 2));
          reject(new Error(`Failed to add tag: ${error.message || error}`));
        } else {
          console.log("✅ Successfully added tag:", `street_${street}`);
          resolve();
        }
      }]);
    });

    // Step 8: Save to local storage
    console.log("Step 8: Saving subscription status...");
    localStorage.setItem(`wonderpush_subscribed_${street}`, "true");
    console.log("✅ Subscription status saved");
    
    console.log("=== WONDERPUSH SUBSCRIPTION COMPLETED SUCCESSFULLY ===");
    return true;
  } catch (error) {
    console.error("=== WONDERPUSH SUBSCRIPTION FAILED ===");
    console.error("Error:", error);
    console.error("Error type:", typeof error);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "N/A");
    throw error;
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
