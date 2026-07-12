/**
 * Sandbox UAT personas — @bhojan.test only. Never uses production exports.
 *
 *   UAT_PASSWORD='...' FIREBASE_PROJECT_ID=bhojanos-prod npx tsx scripts/uat/seed-uat-accounts.ts
 *
 * Requires Firebase Admin credentials (FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS).
 */
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseAdminProvider } from '../../backend-lib/firebase/FirebaseAdminProvider.js';
import { publishTenantDomainEvent } from '../../backend-lib/marketplace/tenantDomainEventBus.js';
import { registerTenantDomainEventSubscribers } from '../../backend-lib/marketplace/registerTenantDomainEvents.js';

const UAT_TENANT_ID = 'uat-sandbox-kitchen';
const UAT_PASSWORD = process.env.UAT_PASSWORD?.trim();

const PERSONAS = [
  { key: 'customer', email: 'uat-customer@bhojan.test', role: 'user' as const },
  { key: 'owner', email: 'uat-owner@bhojan.test', role: 'owner' as const, ownedTenantIds: [UAT_TENANT_ID] },
  { key: 'admin', email: 'uat-platform-admin@bhojan.test', role: 'admin' as const },
  { key: 'superadmin', email: 'uat-super-admin@bhojan.test', role: 'superadmin' as const },
  { key: 'founder', email: 'uat-founder@bhojan.test', role: 'superadmin' as const, ownedTenantIds: [UAT_TENANT_ID] },
];

async function ensureAuthUser(
  auth: import('firebase-admin/auth').Auth,
  email: string,
  password: string,
): Promise<string> {
  try {
    const created = await auth.createUser({ email, password, emailVerified: true });
    return created.uid;
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code !== 'auth/email-already-exists') throw error;
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, { password, emailVerified: true });
    return existing.uid;
  }
}

async function main() {
  if (!UAT_PASSWORD || UAT_PASSWORD.length < 12) {
    throw new Error('Set UAT_PASSWORD (min 12 chars) for sandbox account seeding.');
  }

  registerTenantDomainEventSubscribers();
  const provider = await FirebaseAdminProvider.initialize();
  const db = provider.getFirestore();
  const { getAuth } = await import('firebase-admin/auth');
  const auth = getAuth(provider.getApp());

  const ownerPersona = PERSONAS.find((p) => p.key === 'owner');
  let ownerUid = '';

  for (const persona of PERSONAS) {
    const uid = await ensureAuthUser(auth, persona.email, UAT_PASSWORD);
    if (persona.key === 'owner') ownerUid = uid;

    await db.collection('users').doc(uid).set(
      {
        email: persona.email,
        role: persona.role,
        ...(persona.ownedTenantIds ? { ownedTenantIds: persona.ownedTenantIds } : {}),
        displayName: `UAT ${persona.key}`,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    console.log(`✓ users/${uid} (${persona.email}, ${persona.role})`);
  }

  await db.collection('tenants').doc(UAT_TENANT_ID).set(
    {
      name: 'UAT Sandbox Kitchen',
      slug: UAT_TENANT_ID,
      ownerId: ownerUid,
      status: 'active',
      storeStatus: 'published',
      cuisineTags: ['Biryani', 'UAT'],
      location: { lat: 17.4401, lng: 78.3489, city: 'Hyderabad', state: 'Telangana' },
      storeOperations: {
        isStoreOpen: true,
        businessHoursEnabled: true,
        openTime: '09:00',
        closeTime: '23:00',
      },
      deliveryConfig: {
        enabled: true,
        feesConfigured: true,
        baseFee: 29,
        maxRadius: 12,
        prepTime: 25,
      },
      marketplace: {
        publicRestaurantId: 'obr_uat_sandbox_001',
        cuisineTags: ['Biryani'],
        rating: 4.6,
        ratingCount: 42,
        priceForTwo: 399,
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const menuSnap = await db.collection('menu').where('tenantId', '==', UAT_TENANT_ID).limit(1).get();
  if (menuSnap.empty) {
    await db.collection('menu').add({
      tenantId: UAT_TENANT_ID,
      name: 'UAT Test Biryani',
      category: 'Biryani',
      categoryId: 'cat-biryani',
      price: 199,
      type: 'non-veg',
      description: 'Sandbox menu item for UAT',
      isAvailable: true,
      displayOrder: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`✓ menu item for ${UAT_TENANT_ID}`);
  }

  await publishTenantDomainEvent(db, FieldValue, {
    tenantId: UAT_TENANT_ID,
    type: 'StorefrontUpdated',
    source: 'uat_seed',
  });

  console.log('UAT sandbox seed complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
