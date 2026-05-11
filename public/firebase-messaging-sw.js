importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: "mana-inti-bojanam-pune-492610",
  appId: "1:748579574410:web:e5139b348ed31a3e349373",
  apiKey: "AIzaSyBcAPwlHc_x2RGuUoLj6gdQ0NzuWdl2mvw",
  authDomain: "mana-inti-bojanam-pune-492610.firebaseapp.com",
  messagingSenderId: "748579574410"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Mana Inti Bojanam';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'New Notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || '/my-orders';
  event.waitUntil(clients.openWindow(url));
});
