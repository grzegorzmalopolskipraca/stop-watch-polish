// Minimal no-op sw.js to avoid interfering with OneSignal
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  console.log('[sw.js] Legacy cleanup SW active but inert.');
});