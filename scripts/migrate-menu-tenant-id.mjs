/**
 * Reassign menu items from one tenant key to another (doc id).
 * Usage: npx tsx scripts/migrate-menu-tenant-id.mjs --from inti-bojanam-ghar-kha-khana --to inti-bhojanam-ghar-kha-khana-pune
 */
import { FirebaseAdminProvider } from '../backend-lib/firebase/FirebaseAdminProvider.js';
import { publishTenantDomainEvent } from '../backend-lib/marketplace/tenantDomainEventBus.js';
import { registerTenantDomainEventSubscribers } from '../backend-lib/marketplace/registerTenantDomainEvents.js';
import { FieldValue } from 'firebase-admin/firestore';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const fromKey = arg('--from');
const toTenantId = arg('--to');

if (!fromKey || !toTenantId) {
  console.error('Usage: npx tsx scripts/migrate-menu-tenant-id.mjs --from <oldTenantIdOrSlug> --to <newTenantDocId>');
  process.exit(1);
}

async function main() {
  const provider = await FirebaseAdminProvider.initialize();
  const db = provider.getFirestore();
  registerTenantDomainEventSubscribers();

  const target = await db.collection('tenants').doc(toTenantId).get();
  if (!target.exists) {
    throw new Error(`Target tenant not found: ${toTenantId}`);
  }

  const snapshot = await db.collection('menu').where('tenantId', '==', fromKey).get();
  if (snapshot.empty) {
    console.log(`No menu items with tenantId="${fromKey}"`);
    return;
  }

  let updated = 0;
  const batch = db.batch();
  for (const doc of snapshot.docs) {
    batch.update(doc.ref, {
      tenantId: toTenantId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    updated += 1;
  }
  await batch.commit();
  console.log(`Migrated ${updated} menu items: ${fromKey} → ${toTenantId}`);

  await publishTenantDomainEvent(db, FieldValue, {
    tenantId: toTenantId,
    type: 'MenuUpdated',
    source: 'migrate_menu_tenant_id',
  });
  console.log('Triggered marketplace sync for target tenant');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
