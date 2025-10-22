import { supabase } from "@/integrations/supabase/client";

// VAPID public key - will be generated on first use
const VAPID_PUBLIC_KEY = 'BMqzXH7fFBP0HEsJV_6KHYLKxEp-gZHDvEYqM0JF9x8xKLmN4VnQV_HBQPYd8ZKjF9WvZ8pN7qLmKJHGFd9sRwU';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPushNotifications(street: string): Promise<boolean> {
  try {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.error('Service Workers not supported');
      return false;
    }

    // Check if Push API is supported
    if (!('PushManager' in window)) {
      console.error('Push API not supported');
      return false;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.error('Notification permission denied');
      return false;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Save subscription to database
    const { error } = await supabase.functions.invoke('save-push-subscription', {
      body: {
        subscription: JSON.stringify(subscription),
        street,
      },
    });

    if (error) {
      console.error('Error saving subscription:', error);
      return false;
    }

    // Save to localStorage
    localStorage.setItem(`push-subscription-${street}`, 'true');
    
    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
}

export async function unsubscribeFromPushNotifications(street: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Remove from database
      await supabase.functions.invoke('remove-push-subscription', {
        body: {
          subscription: JSON.stringify(subscription),
          street,
        },
      });
    }

    localStorage.removeItem(`push-subscription-${street}`);
    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

export function isPushSubscribed(street: string): boolean {
  return localStorage.getItem(`push-subscription-${street}`) === 'true';
}
