/** Read mana-inti tenant doc (read-only) to see why plan cards may be disabled. */
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

const doc = await db.collection('tenants').doc('mana-inti').get();
if (!doc.exists) { console.log('tenant mana-inti NOT FOUND'); process.exit(0); }
const d = doc.data() ?? {};
Object.keys(d).forEach(k => {
  if (k.includes('razorpay') || k.includes('subscription') || k.includes('payment')) {
    console.log(k + ':', JSON.stringify(d[k]));
  }
});
process.exit(0);
