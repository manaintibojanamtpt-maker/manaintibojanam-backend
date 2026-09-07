/** Live checkout test: mint founder token -> exchange for ID token -> hit live checkout endpoint. */
import { readFileSync } from 'node:fs';
import { initializeApp as initAdmin, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

const envText = readFileSync('../manaintibojanam-backend.env', 'utf8');
const line = envText.split(/\r?\n/).find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT='));
let val = line.slice('FIREBASE_SERVICE_ACCOUNT='.length).trim();
if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
let inner;
try { inner = JSON.parse('"' + val + '"'); } catch { inner = val; }
initAdmin({ credential: cert(JSON.parse(inner)), projectId: 'bhojanos-prod' });

const uid = 'vpRg4CIY3dcbVL25YbhyIHG1imI2';
const customToken = await getAdminAuth().createCustomToken(uid);
console.log('custom token minted');

const apiKey = process.argv[2];
if (!apiKey) { console.error('usage: node _checkout_live.mjs <WEB_API_KEY>'); process.exit(1); }
const xchg = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: customToken, returnSecureToken: true }),
});
const xchgData = await xchg.json();
if (!xchgData.idToken) { console.error('exchange failed:', JSON.stringify(xchgData).slice(0, 400)); process.exit(1); }
console.log('ID token obtained');
const idToken = xchgData.idToken;

// Test checkout endpoint - this is what the payment button calls
const t0 = Date.now();
const checkoutRes = await fetch('https://www.bhojanos.com/api/owner/subscription/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
  body: JSON.stringify({ tenantId: 'mana-inti', planId: 'pro' }),
});
const elapsed = Date.now() - t0;
const body = await checkoutRes.text();
console.log(`\n=== checkout(pro): ${checkoutRes.status} in ${elapsed}ms`);
console.log(body.slice(0, 1000));
process.exit(0);
