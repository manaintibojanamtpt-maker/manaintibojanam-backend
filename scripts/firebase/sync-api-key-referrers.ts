#!/usr/bin/env tsx
/**
 * Verify (and optionally sync) GCP browser API key HTTP referrer restrictions.
 *
 * Programmatic updates require apikeys.googleapis.com + apikeys.keys.update on the
 * project. When unavailable, this script prints exact Console steps and runs a live
 * identitytoolkit probe for www.bhojanos.com.
 *
 * Usage:
 *   npm run firebase:sync-api-key-referrers           # probe + print missing referrers
 *   npm run firebase:sync-api-key-referrers -- --check # exit 1 if probe fails
 *   npm run firebase:sync-api-key-referrers -- --apply # attempt GCP patch (needs IAM)
 */
import { GoogleAuth } from 'google-auth-library';
import { BHOJANOS_PROD_FIREBASE_PUBLIC } from '../../src/config/bhojanosProdFirebase.js';
import { FirebaseAdminProvider, resolveFirebaseProjectId } from '../../backend-lib/firebase/FirebaseAdminProvider.js';
import { REQUIRED_API_KEY_HTTP_REFERRERS } from './requiredAuthDomains.js';

const CONSOLE_URL =
  'https://console.cloud.google.com/apis/credentials?project=bhojanos-prod';

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error('Failed to obtain GCP access token.');
  return token.token;
}

async function listApiKeys(projectId: string) {
  const token = await getAccessToken();
  const response = await fetch(
    `https://apikeys.googleapis.com/v2/projects/${projectId}/locations/global/keys`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`apikeys.list failed (${response.status}): ${body}`);
  }
  return JSON.parse(body) as { keys?: Array<{ name?: string; displayName?: string; keyString?: string }> };
}

async function getApiKey(name: string) {
  const token = await getAccessToken();
  const response = await fetch(`https://apikeys.googleapis.com/v2/${name}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`apikeys.get failed (${response.status}): ${body}`);
  }
  return JSON.parse(body) as {
    name?: string;
    displayName?: string;
    restrictions?: {
      browserKeyRestrictions?: { allowedReferrers?: string[] };
    };
  };
}

async function patchApiKeyReferrers(keyName: string, allowedReferrers: string[]) {
  const token = await getAccessToken();
  const response = await fetch(`${`https://apikeys.googleapis.com/v2/${keyName}`}?updateMask=restrictions`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      restrictions: {
        browserKeyRestrictions: { allowedReferrers },
      },
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`apikeys.patch failed (${response.status}): ${body}`);
  }
  return JSON.parse(body);
}

async function probeWwwBhojanosReferrer(): Promise<boolean> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(BHOJANOS_PROD_FIREBASE_PUBLIC.apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://www.bhojanos.com',
      Referer: 'https://www.bhojanos.com/super-admin/login',
    },
    body: JSON.stringify({
      email: 'probe@bhojanos.test',
      password: 'not-a-real-password',
      returnSecureToken: true,
    }),
  });
  const text = await response.text();
  if (/API_KEY_HTTP_REFERRER_BLOCKED|API key not valid/i.test(text)) {
    console.error('✘ identitytoolkit probe blocked for www.bhojanos.com');
    console.error(text);
    return false;
  }
  console.log('✔ identitytoolkit probe OK for www.bhojanos.com (INVALID_LOGIN_CREDENTIALS expected).');
  return true;
}

function printManualSteps(missing: string[]) {
  console.log('\nManual GCP Console steps (requires Project Owner / apikeys.admin):');
  console.log(`1. Open ${CONSOLE_URL}`);
  console.log(`2. Edit browser key ending in …${BHOJANOS_PROD_FIREBASE_PUBLIC.apiKey.slice(-6)}`);
  console.log('3. Application restrictions → HTTP referrers (web sites)');
  console.log('4. Add each referrer below, then Save:');
  for (const referrer of missing.length ? missing : REQUIRED_API_KEY_HTTP_REFERRERS) {
    console.log(`   - ${referrer}`);
  }
  console.log('5. Hard-refresh https://www.bhojanos.com/super-admin/login (Ctrl+Shift+R)');
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const apply = process.argv.includes('--apply');

  await FirebaseAdminProvider.initialize({ skipProbe: true });
  const projectId = resolveFirebaseProjectId();

  console.log(`Project: ${projectId}`);
  console.log(`Browser API key: ${BHOJANOS_PROD_FIREBASE_PUBLIC.apiKey}`);

  const probeOk = await probeWwwBhojanosReferrer();
  if (probeOk && !apply) {
    console.log('\nLive probe passed — referrers appear reachable for super-admin login.');
    if (checkOnly) return;
  }

  try {
    const listed = await listApiKeys(projectId);
    const keys = listed.keys ?? [];
    const match = keys.find((key) => key.keyString === BHOJANOS_PROD_FIREBASE_PUBLIC.apiKey);
    if (!match?.name) {
      console.warn('\nCould not match API key in apikeys.list response — use manual Console steps.');
      printManualSteps([...REQUIRED_API_KEY_HTTP_REFERRERS]);
      if (!probeOk && checkOnly) process.exit(1);
      return;
    }

    const detail = await getApiKey(match.name);
    const current = [...(detail.restrictions?.browserKeyRestrictions?.allowedReferrers ?? [])].sort();
    const missing = REQUIRED_API_KEY_HTTP_REFERRERS.filter((referrer) => !current.includes(referrer));

    console.log(`\nCurrent HTTP referrers (${current.length}):`);
    console.log(current.join('\n') || '(none / unrestricted)');

    if (missing.length === 0) {
      console.log('\n✔ All required HTTP referrers are present in GCP.');
      if (!probeOk && checkOnly) process.exit(1);
      return;
    }

    console.log(`\nMissing referrers (${missing.length}): ${missing.join(', ')}`);

    if (apply) {
      const merged = [...new Set([...current, ...missing])].sort();
      await patchApiKeyReferrers(match.name, merged);
      console.log(`\n✔ Patched API key referrers (${merged.length} total).`);
      return;
    }

    printManualSteps(missing);
    if (checkOnly && !probeOk) process.exit(1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`\nAPI Keys API unavailable: ${message}`);
    printManualSteps([...REQUIRED_API_KEY_HTTP_REFERRERS]);
    if (checkOnly && !probeOk) process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
