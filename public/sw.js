// Legacy PWA service worker cleanup
// This file exists only to unregister the old sw.js that conflicts with OneSignal.

self.addEventListener('install', () => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      // Unregister this worker so it doesn't conflict with OneSignal
      const success = await self.registration.unregister();
      // Claim clients and trigger a reload so the page can register OneSignal worker
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        // Best effort: reload open pages to complete the cleanup
        try { client.navigate(client.url); } catch (_) {}
      }
      // Log to help debugging
      console.log('[sw.js cleanup] Unregistered legacy sw.js:', success);
    } catch (e) {
      console.warn('[sw.js cleanup] Failed to unregister legacy sw.js', e);
    }
  })());
});

// No fetch/push handlers on purpose