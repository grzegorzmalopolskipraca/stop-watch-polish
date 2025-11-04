console.log('[SW] Service Worker script loading...');
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
console.log('[SW] OneSignal SDK loaded');

// Add notification event handlers to ensure notifications are displayed
self.addEventListener('push', function(event) {
  console.log('🔔 [SW-Push] Push event received!');
  console.log('[SW-Push] Event data:', event.data);

  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[SW-Push] Push data parsed:', data);
    } catch (e) {
      console.log('[SW-Push] Push data (text):', event.data.text());
    }
  } else {
    console.log('[SW-Push] No data in push event');
  }
});

self.addEventListener('notificationshow', function(event) {
  console.log('✅ [SW-Show] Notification SHOWN!');
  console.log('[SW-Show] Notification:', event.notification);
});

self.addEventListener('notificationclick', function(event) {
  console.log('👆 [SW-Click] Notification clicked!');
  console.log('[SW-Click] Notification:', event.notification);
  console.log('[SW-Click] Action:', event.action);

  event.notification.close();

  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      console.log('[SW-Click] Found ' + clientList.length + ' client windows');

      // If a window client is already open, focus it
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          console.log('[SW-Click] Focusing existing window:', client.url);
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        console.log('[SW-Click] Opening new window');
        return clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('❌ [SW-Close] Notification closed');
  console.log('[SW-Close] Notification:', event.notification);
});

self.addEventListener('install', function(event) {
  console.log('📦 [SW-Install] Service Worker installing...');
});

self.addEventListener('activate', function(event) {
  console.log('✅ [SW-Activate] Service Worker activated!');
});

console.log('✅ [SW] Service Worker event listeners registered');
