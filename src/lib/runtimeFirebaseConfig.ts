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

const DEV_BHOJANOS2_HOSTS = new Set(['bhojanos2.web.app', 'bhojanos2.firebaseapp.com']);

/** True when the SPA should use embedded / runtime bhojanos-prod Firebase config. */
export function isProductionBhojanHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return false;
  if (DEV_BHOJANOS2_HOSTS.has(host)) return false;

  return (
    host === 'bhojanos.com' ||
    host === 'www.bhojanos.com' ||
    host.endsWith('.bhojanos.com') ||
    host.includes('bhojanos.vercel.app') ||
    host.includes('bhojanos-admin.web.app') ||
    host.includes('bhojanos-owner.web.app') ||
    host.includes('manaintibojanam.web.app') ||
    host.includes('orderbhojan.web.app') ||
    host.includes('orderbhojan.firebaseapp.com') ||
    host.includes('bhojanos-prod.web.app') ||
    host.includes('bhojanos-prod.firebaseapp.com')
  );
}
