importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Add notification event handlers to ensure notifications are displayed
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push notification received:', event);
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked:', event);
  event.notification.close();

  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If a window client is already open, focus it
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
