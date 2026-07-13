/**
 * Debug why discovery pool is empty — release validation only.
 */
import { FirebaseAdminProvider } from '../backend-lib/firebase/FirebaseAdminProvider.js';
import { loadVisibleDiscoveryProfiles } from '../backend-lib/marketplace/discoveryProfileWriter.js';
import { isConsumerListedTenant } from '../backend-lib/marketplace/marketplaceVisibility.js';
import { parseFirestoreTenant } from '../backend-lib/marketplace/projectFoodMenuV1.js';
import {
  projectRestaurantPublic,
  type RestaurantPublic,
} from '../backend-lib/marketplace/projectDiscovery.js';
import { isWithinConsumerDiscoveryRadius } from '../backend-lib/marketplace/kitchenFormat.js';

async function main() {
  const coords = {
    lat: Number(process.argv[2] ?? '18.49959440695956'),
    lng: Number(process.argv[3] ?? '73.97858993491619'),
  };

  const provider = await FirebaseAdminProvider.initialize({ skipProbe: true });
  const db = provider.getFirestore();
  const profiles = await loadVisibleDiscoveryProfiles(db);
  const rows: Array<Record<string, unknown>> = [];

  for (const entry of profiles) {
    const tenantDoc = await db.collection('tenants').doc(entry.tenantId).get();
    const raw = tenantDoc.data() as Record<string, unknown>;
    const consumer = isConsumerListedTenant(raw, entry.tenantId);
    const tenant = parseFirestoreTenant(entry.tenantId, raw);
    let restaurant: RestaurantPublic | null = null;
    if (consumer) {
      restaurant = projectRestaurantPublic(tenant, raw, coords);
    }
    rows.push({
      tenantId: entry.tenantId,
      slug: tenant.slug,
      consumerListed: consumer,
      storeStatus: raw.storeStatus,
      status: raw.status,
      hasLocation: Boolean(tenant.location),
      location: tenant.location ?? null,
      distanceKm: restaurant?.distanceKm ?? null,
      withinRadius: isWithinConsumerDiscoveryRadius(restaurant?.distanceKm),
    });
  }

  console.log(JSON.stringify({ coords, rows }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
