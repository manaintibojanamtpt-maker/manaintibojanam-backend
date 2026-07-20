#!/usr/bin/env tsx
/**
 * Probe identitytoolkit signInWithPassword reachability for a host referrer.
 * INVALID_LOGIN_CREDENTIALS means the API key accepted the referrer (expected).
 *
 * Usage:
 *   npm run firebase:probe-api-key-referrer
 *   npm run firebase:probe-api-key-referrer -- --referer https://www.bhojanos.com/super-admin/login
 */
import { BHOJANOS_PROD_FIREBASE_PUBLIC } from '../../src/config/bhojanosProdFirebase.js';

const DEFAULT_REFERER = 'https://www.bhojanos.com/super-admin/login';

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1]?.trim() || undefined;
}

async function probeReferrer(referer: string, origin?: string) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(BHOJANOS_PROD_FIREBASE_PUBLIC.apiKey)}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Referer: referer };
  if (origin) headers.Origin = origin;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: 'probe@bhojanos.test',
      password: 'not-a-real-password',
      returnSecureToken: true,
    }),
  });

  const text = await response.text();
  let message = text;
  try {
    message = JSON.parse(text)?.error?.message ?? text;
  } catch {
    // keep raw body
  }

  return { status: response.status, message, referer, origin };
}

async function main() {
  const referer = readArg('--referer') ?? DEFAULT_REFERER;
  let origin = readArg('--origin');
  if (!origin) {
    try {
      origin = new URL(referer).origin;
    } catch {
      origin = 'https://www.bhojanos.com';
    }
  }

  console.log(`API key: ${BHOJANOS_PROD_FIREBASE_PUBLIC.apiKey}`);
  console.log(`Referer: ${referer}`);
  console.log(`Origin: ${origin}`);

  const result = await probeReferrer(referer, origin);
  console.log(`HTTP ${result.status}: ${result.message}`);

  if (/API_KEY_HTTP_REFERRER_BLOCKED|API key not valid|PERMISSION_DENIED/i.test(result.message)) {
    console.error('\n✘ Referrer blocked — update GCP API key HTTP referrers (see docs/firebase/AUTHORIZED-DOMAINS.md).');
    process.exit(1);
  }

  if (result.status === 400 && /INVALID_LOGIN_CREDENTIALS/i.test(result.message)) {
    console.log('\n✔ identitytoolkit reachable for this referrer (invalid credentials is expected).');
    return;
  }

  if (result.status >= 200 && result.status < 500) {
    console.log('\n✔ identitytoolkit responded (no referrer block detected).');
    return;
  }

  console.error('\n✘ Unexpected identitytoolkit response.');
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
