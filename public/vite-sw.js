// Minimal service worker for VitePWA
// OneSignal handles actual push notifications via OneSignalSDKWorker.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
