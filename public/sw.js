// Service Worker for Push Notifications

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Nowa wiadomość na czacie';
  const options = {
    body: data.body || data.message || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'chat-notification',
    data: {
      url: data.url || '/',
      street: data.street,
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
