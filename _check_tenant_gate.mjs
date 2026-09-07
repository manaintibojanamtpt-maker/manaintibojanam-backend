/** Read mana-inti tenant doc and evaluate the canActivate gating used by OwnerSubscription.tsx. */
import fs from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const envText = fs.readFileSync('../manaintibojanam-backend.env', 'utf8');
const line = envText.split(/\r?\n/).find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT='));
let val = line.slice('FIREBASE_SERVICE_ACCOUNT='.length).trim();
if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
let inner;
try { inner = JSON.parse('"' + val + '"'); } catch { inner = val; }
initializeApp({ credential: cert(JSON.parse(inner)), projectId: 'bhojanos-prod' });
const db = getFirestore();

const tenantId = process.argv[2] || 'mana-inti';
const doc = await db.collection('tenants').doc(tenantId).get();
if (!doc.exists) { console.log('TENANT NOT FOUND: ' + tenantId); process.exit(0); }
const t = doc.data() ?? {};

const checks = {
  isEmailVerified: t.kyc?.emailVerificationStatus === 'verified',
  isMerchantAgreementAccepted: !!t.legal?.merchantDeclarationAcceptedAt,
  isKycCompleted: t.kyc?.verificationLevel !== undefined && t.kyc.verificationLevel >= 0,
  hasBusinessAddress: !!t.location?.lat,
  hasMobileNumber: !!t.kyc?.mobileNumber,
};
console.log('--- gating checks for ' + tenantId);
console.log(JSON.stringify(checks, null, 2));
console.log('canActivate = ' + Object.values(checks).every(Boolean));
console.log('\n--- relevant raw fields');
console.log(JSON.stringify({
  kyc: {
    emailVerificationStatus: t.kyc?.emailVerificationStatus,
    verificationLevel: t.kyc?.verificationLevel,
    mobileNumber: t.kyc?.mobileNumber,
  },
  legal: { merchantDeclarationAcceptedAt: t.legal?.merchantDeclarationAcceptedAt ?? null },
  location: { lat: t.location?.lat ?? null, address: t.location?.address ?? t.address ?? null },
  slug: t.slug,
  id: t.id ?? doc.id,
  onboardingStatus: t.onboardingStatus ?? null,
}, null, 2));
process.exit(0);
