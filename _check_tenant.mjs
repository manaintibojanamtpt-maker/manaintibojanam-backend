/** Inspect founder tenant doc fields that gate subscription payment. */
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const envText = readFileSync('../manaintibojanam-backend.env', 'utf8');
const line = envText.split(/\r?\n/).find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT='));
let val = line.slice('FIREBASE_SERVICE_ACCOUNT='.length).trim();
if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
let inner;
try { inner = JSON.parse('"' + val + '"'); } catch { inner = val; }
initializeApp({ credential: cert(JSON.parse(inner)), projectId: 'bhojanos-prod' });
const db = getFirestore();

for (const id of ['mana-inti', 'manaintibojanam']) {
  const doc = await db.collection('tenants').doc(id).get();
  if (!doc.exists) { console.log(id + ': NOT FOUND'); continue; }
  const d = doc.data();
  console.log(JSON.stringify({
    id,
    slug: d.slug ?? null,
    name: d.name ?? null,
    legal: d.legal ?? null,
    kyc: {
      emailVerificationStatus: d.kyc?.emailVerificationStatus ?? null,
      verificationLevel: d.kyc?.verificationLevel ?? null,
      mobileNumber: d.kyc?.mobileNumber ?? null,
    },
    locationLat: d.location?.lat ?? null,
    plan: d.plan ?? d.subscription?.planId ?? null,
  }, null, 2));
}
process.exit(0);
