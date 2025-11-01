importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Add logging to track push notification delivery
console.log('[OneSignalSDKUpdaterWorker] Service worker loaded at:', new Date().toISOString());

self.addEventListener('install', (event) => {
  console.log('[OneSignalSDKUpdaterWorker] Installing service worker...', event);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[OneSignalSDKUpdaterWorker] Activating service worker...', event);
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[OneSignalSDKUpdaterWorker] Push event received!', {
    timestamp: new Date().toISOString(),
    data: event.data ? event.data.text() : 'No data',
    tag: event.data ? 'Has data' : 'No data'
  });
});

self.addEventListener('notificationshow', (event) => {
  console.log('[OneSignalSDKUpdaterWorker] Notification shown:', {
    timestamp: new Date().toISOString(),
    title: event.notification.title,
    body: event.notification.body,
    tag: event.notification.tag
  });
});

self.addEventListener('notificationclick', (event) => {
  console.log('[OneSignalSDKUpdaterWorker] Notification clicked:', {
    timestamp: new Date().toISOString(),
    action: event.action,
    notification: event.notification.title
  });
});

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[OneSignalSDKUpdaterWorker] Push subscription changed:', event);
});

self.addEventListener('error', (event) => {
  console.error('[OneSignalSDKUpdaterWorker] Service worker error:', event.error);
});