import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirebaseClientConfig } from './config/firebaseClientConfig';

const firebaseConfig = getFirebaseClientConfig();

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((err) => console.error('Auth Persistence Error:', err));

auth.onAuthStateChanged(
  (user) => {
    if (user) {
      console.log(`✅ [Auth] User is signed in: ${user.uid}`);
    } else {
      console.log('ℹ️ [Auth] No user signed in.');
    }
  },
  (error) => {
    console.error('❌ [Auth] Error:', error);
    if (error.message?.includes('suspended')) {
      console.error('🚨 [Auth] API Key is SUSPENDED. Please check Firebase Console.');
    }
  },
);

export async function requestNotificationPermission() {
  try {
    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) {
      console.log('Firebase Messaging is not supported in this browser.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging(app);
      const currentToken = await getToken(messaging).catch((err) => {
        console.warn('Failed to get FCM token with default config', err);
        return null;
      });

      if (currentToken) {
        console.log('FCM Token:', currentToken);
        const currentUser = auth.currentUser;
        if (currentUser) {
          const { getDb } = await import('./lib/firebase-db');
          const { updateDoc, doc, arrayUnion } = await import('firebase/firestore');
          await updateDoc(doc(getDb(), 'users', currentUser.uid), {
            fcmTokens: arrayUnion(currentToken),
          });
        }
        return currentToken;
      }
    }
  } catch (err) {
    console.error('An error occurred while requesting notification permission:', err);
  }
  return null;
}

export default app;
