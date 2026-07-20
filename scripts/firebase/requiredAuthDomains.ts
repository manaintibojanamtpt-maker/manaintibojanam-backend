/** Keep in sync with docs/firebase/AUTHORIZED-DOMAINS.md */
export const REQUIRED_AUTH_DOMAINS = [
  'localhost',
  'bhojanos.com',
  'www.bhojanos.com',
  'orderbhojan.web.app',
  'orderbhojan.firebaseapp.com',
  'orderbhojan.com',
  'www.orderbhojan.com',
  'manaintibojanam.web.app',
  'manaintibojanam.firebaseapp.com',
  'bhojanos-owner.web.app',
  'bhojanos-admin.web.app',
] as const;

/** HTTP referrers for the bhojanos-prod browser API key (GCP Credentials). */
export const REQUIRED_API_KEY_HTTP_REFERRERS = [
  'http://localhost/*',
  'http://127.0.0.1/*',
  'https://localhost/*',
  'https://127.0.0.1/*',
  'https://bhojanos.com/*',
  'https://www.bhojanos.com/*',
  'https://*.vercel.app/*',
  'https://orderbhojan.web.app/*',
  'https://orderbhojan.firebaseapp.com/*',
  'https://orderbhojan.com/*',
  'https://www.orderbhojan.com/*',
  'https://manaintibojanam.web.app/*',
  'https://manaintibojanam.firebaseapp.com/*',
  'https://bhojanos-owner.web.app/*',
  'https://bhojanos-admin.web.app/*',
  'https://bhojanos-prod.web.app/*',
  'https://bhojanos-prod.firebaseapp.com/*',
] as const;
