import cors, { type CorsOptions } from 'cors';

/** Browser origins allowed to call the BhojanOS API cross-origin. */
export const DEFAULT_CORS_ALLOWED_ORIGINS = [
  'https://orderbhojan.web.app',
  'https://www.orderbhojan.com',
  'https://orderbhojan.com',
  'https://www.bhojanos.com',
  'https://bhojanos.com',
  // Capacitor native WebView origins (Android https scheme + iOS capacitor scheme)
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5180',
  'http://localhost:8080',
  'http://localhost:8081',
] as const;

/** Capacitor WebView origins — always merged so native apps work even when CORS_ALLOWED_ORIGINS is set in Render. */
export const CAPACITOR_CORS_ORIGINS = [
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
] as const;

export function resolveCorsAllowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ALLOWED_ORIGINS?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const base = fromEnv?.length ? fromEnv : [...DEFAULT_CORS_ALLOWED_ORIGINS];
  return [...new Set([...base, ...CAPACITOR_CORS_ORIGINS])];
}

export function isCorsOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

export function createCorsOptions(allowedOrigins = resolveCorsAllowedOrigins()): CorsOptions {
  return {
    origin(origin, callback) {
      if (isCorsOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cache-Control',
      'Pragma',
      'X-Tenant-Id',
      'X-Correlation-Id',
      'X-Marketplace-Api-Version',
      'X-Requested-With',
      /** Phase 20 — OrderBhojan canary cohort key (FF_OB_AI_CANARY_HEADERS). */
      'x-ai-canary-key',
    ],
    maxAge: 86_400,
  };
}

export function createCorsMiddleware(allowedOrigins = resolveCorsAllowedOrigins()) {
  return cors(createCorsOptions(allowedOrigins));
}
