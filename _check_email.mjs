/** Confirm founder auth emailVerified + provider info. */
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const envText = readFileSync('../manaintibojanam-backend.env', 'utf8');
const line = envText.split(/\r?\n/).find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT='));
let val = line.slice('FIREBASE_SERVICE_ACCOUNT='.length).trim();
if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
let inner;
try { inner = JSON.parse('"' + val + '"'); } catch { inner = val; }
initializeApp({ credential: cert(JSON.parse(inner)), projectId: 'bhojanos-prod' });
const u = await getAuth().getUserByEmail('manaintibojanamtpt@gmail.com');
console.log(JSON.stringify({
  emailVerified: u.emailVerified,
  disabled: u.disabled,
  phoneNumber: u.phoneNumber,
  providers: u.providerData.map((p) => p.providerId),
}, null, 2));
process.exit(0);