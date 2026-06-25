importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Match the active production database (bhojanos2) instead of the legacy hosting project
firebase.initializeApp({
  apiKey: "AIzaSyBBKia1hM4ZU0hYS52dTy63KTkwzZFYzgI",
  authDomain: "auth.bhojanos.com", // Migrated from forbidden firebaseapp.com URL
  projectId: "bhojanos2",
  storageBucket: "bhojanos2.firebasestorage.app",
  messagingSenderId: "928117320950",
  appId: "1:928117320950:web:e155ae1679e8d9fbe950d7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'BhojanOS';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'New Notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: Object.assign({}, payload.data, payload.notification),
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
