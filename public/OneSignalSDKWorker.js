console.log('[SW] ==================== SERVICE WORKER LOADING ====================');
console.log('[SW] Timestamp:', new Date().toISOString());
console.log('[SW] Service Worker script loading...');
console.log('[SW] Service Worker scope:', self.registration.scope);

importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

console.log('[SW] OneSignal SDK loaded successfully');
console.log('[SW] Checking what events are available...');
console.log('[SW] self.onpush available:', typeof self.onpush);
console.log('[SW] self.onnotificationclick available:', typeof self.onnotificationclick);
console.log('[SW] ==============================================================');

// Add notification event handlers to ensure notifications are displayed
self.addEventListener('push', function(event) {
  const timestamp = new Date().toISOString();
  console.log('');
  console.log('🔔🔔🔔 [SW-Push] ==================== PUSH EVENT RECEIVED ====================');
  console.log('[SW-Push] Timestamp:', timestamp);
  console.log('[SW-Push] Event:', event);
  console.log('[SW-Push] Event.data exists:', !!event.data);

  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[SW-Push] ✅ Push data parsed as JSON:', data);
      console.log('[SW-Push] Data keys:', Object.keys(data));
      if (data.custom) {
        console.log('[SW-Push] Custom data:', data.custom);
      }
    } catch (e) {
      console.log('[SW-Push] ⚠️ Could not parse as JSON, trying text...');
      try {
        const text = event.data.text();
        console.log('[SW-Push] Push data (text):', text);
      } catch (e2) {
        console.log('[SW-Push] ❌ Could not parse data at all:', e2);
      }
    }
  } else {
    console.log('[SW-Push] ⚠️ No data in push event');
  }

  console.log('[SW-Push] =================================================================');
  console.log('');
});

self.addEventListener('notificationshow', function(event) {
  console.log('');
  console.log('✅✅✅ [SW-Show] ==================== NOTIFICATION SHOWN ====================');
  console.log('[SW-Show] Timestamp:', new Date().toISOString());
  console.log('[SW-Show] Notification object:', event.notification);
  console.log('[SW-Show] Notification title:', event.notification.title);
  console.log('[SW-Show] Notification body:', event.notification.body);
  console.log('[SW-Show] Notification tag:', event.notification.tag);
  console.log('[SW-Show] Notification icon:', event.notification.icon);
  console.log('[SW-Show] Notification data:', event.notification.data);
  console.log('[SW-Show] ================================================================');
  console.log('');
});

self.addEventListener('notificationclick', function(event) {
  console.log('');
  console.log('👆👆👆 [SW-Click] ==================== NOTIFICATION CLICKED ====================');
  console.log('[SW-Click] Timestamp:', new Date().toISOString());
  console.log('[SW-Click] Notification:', event.notification);
  console.log('[SW-Click] Notification title:', event.notification.title);
  console.log('[SW-Click] Action:', event.action);
  console.log('[SW-Click] Notification data:', event.notification.data);

  event.notification.close();
  console.log('[SW-Click] Notification closed');

  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      console.log('[SW-Click] Found ' + clientList.length + ' client windows');

      // If a window client is already open, focus it
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          console.log('[SW-Click] ✅ Focusing existing window:', client.url);
          console.log('[SW-Click] =================================================================');
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        console.log('[SW-Click] ✅ Opening new window at: /');
        console.log('[SW-Click] =================================================================');
        return clients.openWindow('/');
      }
      console.log('[SW-Click] =================================================================');
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('');
  console.log('❌ [SW-Close] ==================== NOTIFICATION CLOSED ====================');
  console.log('[SW-Close] Timestamp:', new Date().toISOString());
  console.log('[SW-Close] Notification:', event.notification);
  console.log('[SW-Close] Notification title:', event.notification.title);
  console.log('[SW-Close] ==================================================================');
  console.log('');
});

self.addEventListener('install', function(event) {
  console.log('📦 [SW-Install] Service Worker installing...');
});

self.addEventListener('activate', function(event) {
  console.log('✅ [SW-Activate] Service Worker activated!');
  console.log('[SW-Activate] Scope:', self.registration.scope);
  console.log('[SW-Activate] Ready to handle events');
});

// Add message handler for testing communication
self.addEventListener('message', function(event) {
  console.log('');
  console.log('💬 [SW-Message] ==================== MESSAGE RECEIVED ====================');
  console.log('[SW-Message] Timestamp:', new Date().toISOString());
  console.log('[SW-Message] Message data:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW-Message] Received SKIP_WAITING - activating new service worker...');
    self.skipWaiting();
    console.log('[SW-Message] ✅ skipWaiting() called');
  }

  if (event.data && event.data.type === 'PING') {
    console.log('[SW-Message] Received PING, sending PONG...');
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        type: 'PONG',
        timestamp: new Date().toISOString(),
        serviceWorkerActive: true,
        scope: self.registration.scope
      });
      console.log('[SW-Message] PONG sent');
    } else {
      console.error('[SW-Message] ❌ No message port available for PONG response');
    }
  }

  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    console.log('[SW-Message] Received TEST_NOTIFICATION request');
    self.registration.showNotification('SW Message Test', {
      body: 'Service Worker received message and showing notification',
      icon: '/icon-192.png',
      tag: 'sw-message-test'
    }).then(() => {
      console.log('[SW-Message] Test notification shown');
    });
  }

  console.log('[SW-Message] ================================================================');
  console.log('');
});

console.log('✅ [SW] All Service Worker event listeners registered');
console.log('[SW] Event listeners: push, notificationshow, notificationclick, notificationclose, install, activate, message');
