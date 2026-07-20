/** Public bhojanos-prod Firebase web SDK config (apiKey is domain-restricted in GCP, not secret). */
export const BHOJANOS_PROD_FIREBASE_PUBLIC = {
  apiKey: 'AIzaSyC6kCJwsEWuwLVPGmJsVDDxTyWlayp2yLQ',
  authDomain: 'bhojanos-prod.firebaseapp.com',
  projectId: 'bhojanos-prod',
  storageBucket: 'bhojanos-prod.firebasestorage.app',
  messagingSenderId: '170989397954',
  appId: '1:170989397954:web:9c67dbacc58329f360185b',
} as const;

export type BhojanosProdFirebasePublic = typeof BHOJANOS_PROD_FIREBASE_PUBLIC;
