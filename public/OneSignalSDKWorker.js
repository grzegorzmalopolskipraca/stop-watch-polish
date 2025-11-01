importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Add logging to track push notification delivery
console.log('[OneSignalSDKWorker] Service worker loaded at:', new Date().toISOString());

self.addEventListener('install', (event) => {
  console.log('[OneSignalSDKWorker] Installing service worker...', event);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[OneSignalSDKWorker] Activating service worker...', event);
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[OneSignalSDKWorker] Push event received!', {
    timestamp: new Date().toISOString(),
    data: event.data ? event.data.text() : 'No data',
    tag: event.data ? 'Has data' : 'No data'
  });
});

self.addEventListener('notificationshow', (event) => {
  console.log('[OneSignalSDKWorker] Notification shown:', {
    timestamp: new Date().toISOString(),
    title: event.notification.title,
    body: event.notification.body,
    tag: event.notification.tag
  });
});

self.addEventListener('notificationclick', (event) => {
  console.log('[OneSignalSDKWorker] Notification clicked:', {
    timestamp: new Date().toISOString(),
    action: event.action,
    notification: event.notification.title
  });
});

self.addEventListener('notificationclose', (event) => {
  console.log('[OneSignalSDKWorker] Notification closed:', {
    timestamp: new Date().toISOString(),
    title: event.notification?.title,
    tag: event.notification?.tag
  });
});

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[OneSignalSDKWorker] Push subscription changed:', event);
});

self.addEventListener('error', (event) => {
  console.error('[OneSignalSDKWorker] Service worker error:', event.error);
});
