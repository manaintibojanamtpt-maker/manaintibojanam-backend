#!/usr/bin/env node
/**
 * Link an owner email to a tenant doc (ownerId + ownedTenantIds).
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=... FIREBASE_PROJECT_ID=bhojanos-prod \
 *   node scripts/repair-owner-tenant-link.mjs intibojanampune@gmail.com inti-bhojanam-ghar-kha-khana-pune
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const email = (process.argv[2] || '').trim().toLowerCase();
const tenantId = (process.argv[3] || '').trim();
const projectId = process.env.FIREBASE_PROJECT_ID || 'bhojanos-prod';

if (!email || !tenantId) {
  console.error('Usage: node scripts/repair-owner-tenant-link.mjs <email> <tenantId>');
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth();
const db = getFirestore();

const user = await auth.getUserByEmail(email);
const tenantRef = db.collection('tenants').doc(tenantId);
const tenantSnap = await tenantRef.get();

if (!tenantSnap.exists) {
  console.error(`Tenant not found: ${tenantId}`);
  process.exit(1);
}

const userRef = db.collection('users').doc(user.uid);
const userSnap = await userRef.get();
const prevOwned = userSnap.exists ? userSnap.data()?.ownedTenantIds || [] : [];

await tenantRef.set(
  {
    ownerId: user.uid,
    ownerEmail: email,
    updatedAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
);

const ownedSet = new Set([tenantId, ...prevOwned.filter((id) => id && id !== 'mana-inti')]);
const ownedTenantIds = Array.from(ownedSet);

await userRef.set(
  {
    email,
    role: 'owner',
    ownedTenantIds,
    updatedAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
);

console.log(
  JSON.stringify(
    {
      ok: true,
      email,
      uid: user.uid,
      tenantId,
      tenantName: tenantSnap.data()?.name || tenantSnap.data()?.displayName,
      ownedTenantIds,
    },
    null,
    2,
  ),
);
