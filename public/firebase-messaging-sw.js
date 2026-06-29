importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const API_BASE = 'https://manaintibojanam-backend.onrender.com';

async function loadFirebaseConfig() {
  const paths = ['/api/client-config', '/api/health?webClient=1'];
  for (const path of paths) {
    try {
      const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      const fb = data.firebase?.apiKey
        ? data.firebase
        : data.webClient?.firebase?.apiKey
          ? data.webClient.firebase
          : null;
      if (fb?.apiKey && fb?.projectId) return fb;
    } catch (_) {
      /* try next path */
    }
  }
  return null;
}

(async function initMessaging() {
  const config = await loadFirebaseConfig();
  if (!config) {
    console.warn('[firebase-messaging-sw.js] Firebase web config unavailable — push disabled until redeploy');
    return;
  }
  firebase.initializeApp(config);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage(function (payload) {
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
})();
