#!/usr/bin/env node
/**
 * Check Firebase Auth record for an owner email (bhojanos-prod).
 * Usage: FIREBASE_PROJECT_ID=bhojanos-prod GOOGLE_APPLICATION_CREDENTIALS=... node scripts/check-owner-auth.mjs intibojanampune@gmail.com
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const email = (process.argv[2] || 'intibojanampune@gmail.com').trim().toLowerCase();
const projectId = process.env.FIREBASE_PROJECT_ID || 'bhojanos-prod';

initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth();
const db = getFirestore();

try {
  const user = await auth.getUserByEmail(email);
  const providers = user.providerData.map((p) => p.providerId);
  const doc = await db.collection('users').doc(user.uid).get();
  const data = doc.data() ?? {};

  console.log(JSON.stringify({
    email,
    uid: user.uid,
    providers: providers.length ? providers : ['password'],
    emailVerified: user.emailVerified,
    disabled: user.disabled,
    ownedTenantIds: data.ownedTenantIds ?? [],
    role: data.role ?? null,
  }, null, 2));
} catch (err) {
  console.error('Auth lookup failed:', err?.message || err);
  process.exit(1);
}
