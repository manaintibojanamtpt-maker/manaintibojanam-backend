// Push notifications are handled by the primary Workbox service worker (/sw.js).
// Firebase Messaging probes this legacy path — keep sync handlers so SDK registration does not warn.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'BhojanOS', body: event.data.text() };
  }
  const notification = payload.notification || payload;
  const data = payload.data || {};
  event.waitUntil(
    self.registration.showNotification(notification.title || data.title || 'BhojanOS', {
      body: notification.body || data.body || 'New notification',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data,
    }),
  );
});

self.addEventListener('pushsubscriptionchange', () => {
  /* handled by main app on next sign-in */
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || '/owner/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
