/**
 * P0 hotfix — republish discovery profiles for live/published tenants.
 * Run: FIREBASE_PROJECT_ID=bhojanos-prod npx tsx scripts/hotfix/p0-marketplace-repair.ts
 */
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseAdminProvider } from '../../backend-lib/firebase/FirebaseAdminProvider.js';
import { isConsumerListedTenant } from '../../backend-lib/marketplace/marketplaceVisibility.js';
import { publishTenantDomainEvent } from '../../backend-lib/marketplace/tenantDomainEventBus.js';
import { registerTenantDomainEventSubscribers } from '../../backend-lib/marketplace/registerTenantDomainEvents.js';
import { normalizeStoreTimeToHHmm } from '../../backend-lib/marketplace/tenantProjectionHelpers.js';

async function main() {
  registerTenantDomainEventSubscribers();
  const provider = await FirebaseAdminProvider.initialize();
  const db = provider.getFirestore();

  const snapshot = await db.collection('tenants').get();
  let republished = 0;
  let hoursNormalized = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const raw = doc.data() as Record<string, unknown>;
    if (!isConsumerListedTenant(raw)) {
      skipped += 1;
      continue;
    }

    const ops =
      raw.storeOperations && typeof raw.storeOperations === 'object'
        ? ({ ...(raw.storeOperations as Record<string, unknown>) } as Record<string, unknown>)
        : null;

    if (ops?.openTime && typeof ops.openTime === 'string') {
      const normalizedOpen = normalizeStoreTimeToHHmm(ops.openTime);
      if (normalizedOpen !== ops.openTime) {
        ops.openTime = normalizedOpen;
        hoursNormalized += 1;
      }
    }
    if (ops?.closeTime && typeof ops.closeTime === 'string') {
      const normalizedClose = normalizeStoreTimeToHHmm(ops.closeTime);
      if (normalizedClose !== ops.closeTime) {
        ops.closeTime = normalizedClose;
        hoursNormalized += 1;
      }
    }

    const patch: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (ops) patch.storeOperations = ops;
    if (raw.storeStatus === 'live') {
      patch.storeStatus = 'published';
    }

    await doc.ref.set(patch, { merge: true });

    await publishTenantDomainEvent(db, FieldValue, {
      tenantId: doc.id,
      type: 'StorefrontUpdated',
      source: 'p0_marketplace_repair',
    });
    republished += 1;
    console.log(`✓ republished ${doc.id}`);
  }

  console.log(`Done. republished=${republished} hoursNormalized=${hoursNormalized} skipped=${skipped}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
