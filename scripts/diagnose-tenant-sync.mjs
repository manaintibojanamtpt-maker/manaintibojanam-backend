/**
 * Diagnose marketplace sync for a tenant (by name/slug substring).
 * Usage: npx tsx scripts/diagnose-tenant-sync.mjs "ghar kha"
 */
import { FirebaseAdminProvider } from '../backend-lib/firebase/FirebaseAdminProvider.js';
import { isMarketplaceVisibleTenant } from '../backend-lib/marketplace/marketplaceVisibility.js';
import { publishTenantDomainEvent } from '../backend-lib/marketplace/tenantDomainEventBus.js';
import { registerTenantDomainEventSubscribers } from '../backend-lib/marketplace/registerTenantDomainEvents.js';
import { FieldValue } from 'firebase-admin/firestore';

const needle = (process.argv[2] || 'ghar').toLowerCase();
const triggerSync = process.argv.includes('--sync');

async function main() {
  const provider = await FirebaseAdminProvider.initialize();
  const db = provider.getFirestore();
  registerTenantDomainEventSubscribers();

  const tenants = await db.collection('tenants').get();
  const matches = [];

  for (const doc of tenants.docs) {
    const d = doc.data();
    const name = String(d.name || d.displayName || d.businessName || '');
    const slug = String(d.slug || d.restaurantSlug || '');
    const hay = `${name} ${slug}`.toLowerCase();
    if (!hay.includes(needle)) continue;

    const menuSnap = await db.collection('menu').where('tenantId', '==', doc.id).get();
    const profileSnap = await db.collection('discovery_profiles').doc(doc.id).get();
    const profile = profileSnap.exists ? profileSnap.data() : null;

    matches.push({
      tenantId: doc.id,
      name,
      slug,
      storeStatus: d.storeStatus,
      status: d.status,
      sandboxMode: d.sandboxMode,
      marketplaceVisible: isMarketplaceVisibleTenant(d),
      menuItems: menuSnap.size,
      discoveryProfile: profile
        ? {
            visible: profile.visible,
            menuItemCount: profile.menuItemCount,
            syncRevision: profile.syncRevision,
            location: profile.location,
          }
        : null,
    });

    if (triggerSync && isMarketplaceVisibleTenant(d)) {
      await publishTenantDomainEvent(db, FieldValue, {
        tenantId: doc.id,
        type: 'MenuUpdated',
        source: 'diagnose_tenant_sync',
      });
      console.log(`Triggered sync for ${doc.id}`);
    }
  }

  if (matches.length === 0) {
    console.log(`No tenants matching "${needle}"`);
    process.exit(1);
  }

  console.log(JSON.stringify(matches, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
