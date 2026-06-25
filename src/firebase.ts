import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { EnvironmentConfig } from './config/environment';

// Default to the production bhojanos2 config, but allow environment overrides
// We avoid hardcoding firebaseapp.com directly by deriving it or using env var
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBBKia1hM4ZU0hYS52dTy63KTkwzZFYzgI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (EnvironmentConfig.isProduction() ? "auth.bhojanos.com" : "bhojanos2.firebaseapp.com"),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bhojanos2",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bhojanos2.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "928117320950",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:928117320950:web:e155ae1679e8d9fbe950d7",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-PLZEZBXYQK"
};

// Initialize app first - this MUST succeed
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set persistence to local for better session management
setPersistence(auth, browserLocalPersistence).catch(err => console.error("Auth Persistence Error:", err));

// Add auth state logging to check if API key is working
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log(`✅ [Auth] User is signed in: ${user.uid}`);
  } else {
    console.log(`ℹ️ [Auth] No user signed in.`);
  }
}, (error) => {
  console.error(`❌ [Auth] Error:`, error);
  if (error.message?.includes("suspended")) {
    console.error("🚨 [Auth] API Key is SUSPENDED. Please check Firebase Console.");
  }
});

// Push Notification Logic
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
      const currentToken = await getToken(messaging).catch(err => {
        console.warn('Failed to get FCM token with default config', err);
        return null;
      });

      if (currentToken) {
        console.log('FCM Token:', currentToken);
        const currentUser = auth.currentUser;
        if (currentUser) {
          // Dynamic import of db to avoid circular/static deps
          const { getDb } = await import('./lib/firebase-db');
          const { updateDoc, doc, arrayUnion } = await import('firebase/firestore');
          await updateDoc(doc(getDb(), 'users', currentUser.uid), {
            fcmTokens: arrayUnion(currentToken)
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
