/**
 * Backfill discovery_profiles for all marketplace-visible tenants.
 * Run after deploy: npx tsx scripts/bootstrap-discovery-profiles.ts
 */
import { FirebaseAdminProvider } from '../backend-lib/firebase/FirebaseAdminProvider.js';
import { isConsumerListedTenant } from '../backend-lib/marketplace/marketplaceVisibility.js';
import { publishTenantDomainEvent } from '../backend-lib/marketplace/tenantDomainEventBus.js';
import { registerTenantDomainEventSubscribers } from '../backend-lib/marketplace/registerTenantDomainEvents.js';
import { FieldValue } from 'firebase-admin/firestore';

async function main() {
  const provider = await FirebaseAdminProvider.initialize();
  const db = provider.getFirestore();
  registerTenantDomainEventSubscribers();

  const snapshot = await db.collection('tenants').get();
  let written = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const raw = doc.data() as Record<string, unknown>;
    if (!isConsumerListedTenant(raw)) {
      skipped += 1;
      continue;
    }
    await publishTenantDomainEvent(db, FieldValue, {
      tenantId: doc.id,
      type: 'StorefrontUpdated',
      source: 'bootstrap_discovery_profiles',
    });
    written += 1;
    console.log(`✓ discovery_profiles/${doc.id}`);
  }

  console.log(`Done. written=${written} skipped=${skipped}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
