/* OrderBhojan — FCM background push (config injected at runtime by the app shell) */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: 'OrderBhojan', body: event.data.text() } };
  }
  const notification = payload.notification || payload;
  const data = payload.data || {};
  event.waitUntil(
    self.registration.showNotification(notification.title || data.title || 'OrderBhojan', {
      body: notification.body || data.body || 'Order update',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || (data.orderId ? `/orders/${data.orderId}/track` : '/orders');
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
