/**
 * E2E sync lab — Firestore tenant used by owner → OrderBhojan Playwright certification.
 * CLI: npx tsx scripts/e2e/e2eSyncLabHarness.ts <prepare-draft|publish|update-name|update-menu-options|unpublish>
 */
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseAdminProvider } from '../../backend-lib/firebase/FirebaseAdminProvider.js';
import { publishTenantDomainEvent } from '../../backend-lib/marketplace/tenantDomainEventBus.js';
import { registerTenantDomainEventSubscribers } from '../../backend-lib/marketplace/registerTenantDomainEvents.js';
import { countTenantMenuItems } from '../../backend-lib/marketplace/discoveryProfileWriter.js';
import { validateTenantPublishable } from '../../backend-lib/marketplace/tenantDiscoveryProfile.js';

/** Customer-visible sync SLA — revision poll is 3s; budget allows one poll + refetch. */
export const OWNER_MARKETPLACE_SYNC_SLA_MS = 5_000;

export const E2E_SYNC_LAB_TENANT_ID = 'e2e-sync-lab';
export const E2E_SYNC_LAB_BASE_NAME = 'E2E Sync Lab';
export const E2E_SYNC_LAB_OWNER_UID = 'e2e-sync-lab-owner';
export const E2E_SYNC_LAB_MENU_ITEM_NAME = 'E2E Test Biryani';
export const E2E_SYNC_LAB_VARIANT_HALF = 'Half Plate';
export const E2E_SYNC_LAB_ADDON_RAITA = 'Extra Raita';

export interface E2eMenuOptionsUpdate {
  readonly variants?: readonly {
    readonly kind?: string;
    readonly displayName: string;
    readonly price: number;
    readonly offerPrice?: number;
  }[];
  readonly addonGroups?: readonly {
    readonly displayName: string;
    readonly required?: boolean;
    readonly options: readonly { readonly displayName: string; readonly price: number }[];
  }[];
}

export const E2E_DEFAULT_MENU_OPTIONS: E2eMenuOptionsUpdate = {
  variants: [{ kind: 'half', displayName: E2E_SYNC_LAB_VARIANT_HALF, price: 169, offerPrice: 149 }],
  addonGroups: [
    {
      displayName: 'Extras',
      options: [{ displayName: E2E_SYNC_LAB_ADDON_RAITA, price: 29 }],
    },
  ],
};

/** Matches OrderBhojan DEFAULT_DISCOVERY_COORDS (Pune marketplace cluster). */
const E2E_LOCATION = {
  lat: 17.4401,
  lng: 78.3489,
  city: 'Hyderabad',
  state: 'Telangana',
} as const;

export function isE2eFirebaseConfigured(): boolean {
  return Boolean(process.env.FIREBASE_PROJECT_ID?.trim());
}

async function openHarness() {
  registerTenantDomainEventSubscribers();
  const provider = await FirebaseAdminProvider.initialize();
  return provider.getFirestore();
}

async function ensureE2eSyncLabOwner(db: Firestore): Promise<void> {
  await db.collection('users').doc(E2E_SYNC_LAB_OWNER_UID).set(
    {
      role: 'owner',
      email: 'e2e-sync-lab@bhojan.test',
      ownedTenantIds: [E2E_SYNC_LAB_TENANT_ID],
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function findE2eSyncLabMenuItemDoc(db: Firestore) {
  const snapshot = await db.collection('menu').where('tenantId', '==', E2E_SYNC_LAB_TENANT_ID).get();
  const doc = snapshot.docs.find((entry) => entry.data().name === E2E_SYNC_LAB_MENU_ITEM_NAME);
  if (!doc) {
    throw new Error(`E2E menu item "${E2E_SYNC_LAB_MENU_ITEM_NAME}" missing — run prepare-draft first`);
  }
  return doc;
}

async function resolveE2eOwnerIdToken(): Promise<string> {
  const provider = await FirebaseAdminProvider.initialize();
  const { getAuth } = await import('firebase-admin/auth');
  const customToken = await getAuth(provider.getApp()).createCustomToken(E2E_SYNC_LAB_OWNER_UID);
  const apiKey =
    process.env.FIREBASE_WEB_API_KEY?.trim() || process.env.VITE_FIREBASE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'FIREBASE_WEB_API_KEY or VITE_FIREBASE_API_KEY required to call owner menu API in E2E harness',
    );
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const payload = (await response.json()) as { idToken?: string; error?: { message?: string } };
  if (!response.ok || !payload.idToken) {
    throw new Error(payload.error?.message ?? `Failed to exchange custom token (${response.status})`);
  }
  return payload.idToken;
}

async function ensureMenuItem(db: Awaited<ReturnType<typeof openHarness>>): Promise<void> {
  const tenantId = E2E_SYNC_LAB_TENANT_ID;
  const existing = await db.collection('menu').where('tenantId', '==', tenantId).get();
  if (existing.docs.some((entry) => entry.data().name === E2E_SYNC_LAB_MENU_ITEM_NAME)) return;

  await db.collection('menu').add({
    tenantId,
    name: E2E_SYNC_LAB_MENU_ITEM_NAME,
    category: 'Biryani',
    categoryId: 'cat-biryani',
    price: 249,
    type: 'non-veg',
    description: 'Harness menu item for publish validation',
    isAvailable: true,
    displayOrder: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function prepareE2eSyncLabDraft(): Promise<void> {
  const db = await openHarness();
  const tenantId = E2E_SYNC_LAB_TENANT_ID;

  await ensureE2eSyncLabOwner(db);

  await db.collection('tenants').doc(tenantId).set(
    {
      name: E2E_SYNC_LAB_BASE_NAME,
      slug: tenantId,
      ownerId: E2E_SYNC_LAB_OWNER_UID,
      status: 'active',
      storeStatus: 'draft',
      cuisineTags: ['Biryani', 'E2E'],
      location: { ...E2E_LOCATION },
      storeOperations: {
        isStoreOpen: true,
        businessHoursEnabled: true,
        openTime: '09:00 AM',
        closeTime: '11:00 PM',
      },
      deliveryConfig: {
        enabled: true,
        feesConfigured: true,
        prepTime: 25,
        deliveryFee: 29,
      },
      branding: {
        logoUrl: 'https://placehold.co/96x96/orange/white?text=E2E',
        coverUrl: 'https://placehold.co/800x400/orange/white?text=E2E+Sync+Lab',
      },
      marketplace: {
        publicRestaurantId: 'obr_e2e_sync_lab',
        tagline: 'Owner sync certification kitchen',
        description: 'Playwright E2E tenant — not for production orders.',
        cuisineTags: ['Biryani'],
        priceBandLabel: '₹₹',
        priceForTwo: 499,
        rating: 4.7,
        ratingCount: 42,
        deliveryFee: 29,
        featuredFoodIds: [],
        todaysSpecialFoodIds: [],
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await ensureMenuItem(db);

  await publishTenantDomainEvent(db, FieldValue, {
    tenantId,
    type: 'StorefrontUpdated',
    source: 'e2e_prepare_draft',
  });
}

export async function publishE2eSyncLab(): Promise<{ poolSyncRevision: string }> {
  const db = await openHarness();
  const tenantId = E2E_SYNC_LAB_TENANT_ID;
  const doc = await db.collection('tenants').doc(tenantId).get();
  if (!doc.exists) {
    throw new Error(`E2E tenant ${tenantId} missing — run prepare-draft first`);
  }

  const raw = doc.data() as Record<string, unknown>;
  const menuCount = await countTenantMenuItems(db, tenantId);
  const validation = validateTenantPublishable(raw, menuCount);
  if (!validation.ok) {
    throw new Error(`E2E tenant not publishable: ${validation.errors.join('; ')}`);
  }

  await db.collection('tenants').doc(tenantId).set(
    {
      storeStatus: 'published',
      publishedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const sync = await publishTenantDomainEvent(db, FieldValue, {
    tenantId,
    type: 'StoreOperationsUpdated',
    source: 'e2e_owner_publish',
  });

  return { poolSyncRevision: sync.poolSyncRevision };
}

export async function unpublishE2eSyncLab(): Promise<void> {
  const db = await openHarness();
  const tenantId = E2E_SYNC_LAB_TENANT_ID;

  await db.collection('tenants').doc(tenantId).set(
    {
      storeStatus: 'draft',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await publishTenantDomainEvent(db, FieldValue, {
    tenantId,
    type: 'StoreOperationsUpdated',
    source: 'e2e_unpublish',
  });
}

export async function updateE2eSyncLabName(displayName: string): Promise<{ poolSyncRevision: string }> {
  const db = await openHarness();
  const tenantId = E2E_SYNC_LAB_TENANT_ID;

  await db.collection('tenants').doc(tenantId).set(
    {
      name: displayName,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const sync = await publishTenantDomainEvent(db, FieldValue, {
    tenantId,
    type: 'StorefrontUpdated',
    source: 'e2e_owner_storefront_edit',
  });

  return { poolSyncRevision: sync.poolSyncRevision };
}

export async function updateE2eSyncLabMenuItemViaOwnerApi(
  options: E2eMenuOptionsUpdate = E2E_DEFAULT_MENU_OPTIONS,
  apiBaseUrl = process.env.E2E_MARKETPLACE_API ?? 'http://localhost:8081',
): Promise<{ menuItemId: string }> {
  const db = await openHarness();
  const menuDoc = await findE2eSyncLabMenuItemDoc(db);
  const existing = menuDoc.data() as Record<string, unknown>;
  const idToken = await resolveE2eOwnerIdToken();

  const body: Record<string, unknown> = {
    tenantId: E2E_SYNC_LAB_TENANT_ID,
    name: existing.name ?? E2E_SYNC_LAB_MENU_ITEM_NAME,
    description: existing.description ?? '',
    price: existing.price ?? 249,
    category: existing.category ?? 'Biryani',
    type: existing.type ?? 'non-veg',
    isAvailable: existing.isAvailable !== false,
    image: existing.image ?? '',
    ...(options.variants ? { variants: [...options.variants] } : {}),
    ...(options.addonGroups ? { addonGroups: [...options.addonGroups] } : {}),
  };

  const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/owner/menu/items/${menuDoc.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { success?: boolean; id?: string; error?: string };
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error ?? `Owner menu PUT failed (${response.status})`);
  }

  return { menuItemId: payload.id ?? menuDoc.id };
}

async function main() {
  const action = process.argv[2];
  switch (action) {
    case 'prepare-draft':
      await prepareE2eSyncLabDraft();
      console.log(`✓ ${E2E_SYNC_LAB_TENANT_ID} prepared (draft)`);
      break;
    case 'publish': {
      const result = await publishE2eSyncLab();
      console.log(`✓ published poolSyncRevision=${result.poolSyncRevision}`);
      break;
    }
    case 'unpublish':
      await unpublishE2eSyncLab();
      console.log(`✓ ${E2E_SYNC_LAB_TENANT_ID} unpublished`);
      break;
    case 'update-name': {
      const name = process.argv[3];
      if (!name?.trim()) throw new Error('update-name requires a display name argument');
      const result = await updateE2eSyncLabName(name.trim());
      console.log(`✓ renamed poolSyncRevision=${result.poolSyncRevision}`);
      break;
    }
    case 'update-menu-options': {
      const result = await updateE2eSyncLabMenuItemViaOwnerApi();
      console.log(
        `✓ menu item ${result.menuItemId} updated via owner API (variants + addonGroups)`,
      );
      break;
    }
    default:
      console.error(
        'Usage: tsx e2eSyncLabHarness.ts <prepare-draft|publish|unpublish|update-name|update-menu-options>',
      );
      process.exit(1);
  }
}

const isDirectRun = process.argv[1]?.includes('e2eSyncLabHarness');
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
