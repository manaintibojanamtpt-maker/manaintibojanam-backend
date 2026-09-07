/** Live test of owner subscription checkout: mint token -> exchange for ID token -> call live API. */
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

// Exchange for ID token using Web API key
const apiKey = 'AIzaSyC6kCJwsEWuwLVPGmJsVDDxTyWlayp2yLQ';
console.log('using WEB_API_KEY=' + apiKey.slice(0, 20) + '...');
const xchg = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: customToken, returnSecureToken: true }),
});
const xchgData = await xchg.json();
if (!xchgData.idToken) { console.error('exchange failed:', JSON.stringify(xchgData).slice(0, 400)); process.exit(1); }
console.log('ID token obtained (uid confirmed)');

const idToken = xchgData.idToken;

// Test checkout endpoint live
const checkoutRes = await fetch('https://www.bhojanos.com/api/owner/subscription/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
  body: JSON.stringify({ tenantId: 'mana-inti', planId: 'pro' }),
});
console.log('\n=== checkout status:', checkoutRes.status);
const checkoutBody = await checkoutRes.text();
console.log('checkout body (first 1000 chars):', checkoutBody.slice(0, 1000));

// Also test status
const statusRes = await fetch('https://www.bhojanos.com/api/owner/subscription/status?tenantId=mana-inti', {
  headers: { Authorization: `Bearer ${idToken}` },
});
console.log('\n=== status status:', statusRes.status);
const statusBody = await statusRes.text();
console.log('status body (first 600 chars):', statusBody.slice(0, 600));

// Backend API direct test
const tf0 = Date.now();
const directRes = await fetch('https://manaintibojanam-backend.onrender.com/api/owner/subscription/status?tenantId=mana-inti', {
  headers: { Authorization: `Bearer ${idToken}` },
  signal: AbortSignal.timeout(20_000),
}).catch((e) => ({ ok: false, status: 0, text: async () => 'FETCH DONE: ' + e.message }));
console.log('\n=== direct status to Render ->', directRes.status, 'in', Date.now() - tf0, 'ms');
console.log((await directRes.text()).slice(0, 600));

process.exit(0);

