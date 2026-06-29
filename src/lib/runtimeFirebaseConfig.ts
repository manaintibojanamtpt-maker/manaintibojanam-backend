import type { FirebaseClientConfig } from '../config/firebaseClientConfig';

declare global {
  interface Window {
    __BH_FIREBASE_CONFIG__?: FirebaseClientConfig;
  }
}

export function readRuntimeFirebaseConfig(): FirebaseClientConfig | null {
  if (typeof window === 'undefined') return null;
  const cfg = window.__BH_FIREBASE_CONFIG__;
  if (!cfg?.apiKey || !cfg?.projectId) return null;
  return cfg;
}

export function isProductionBhojanHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host === 'bhojanos.com' ||
    host === 'www.bhojanos.com' ||
    host.endsWith('.bhojanos.com') ||
    host.includes('bhojanos.vercel.app')
  );
}
