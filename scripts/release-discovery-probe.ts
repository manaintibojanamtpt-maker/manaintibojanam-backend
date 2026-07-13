/**
 * Production discovery pool probe — release validation only.
 * Usage: FIREBASE_PROJECT_ID=bhojanos-prod GOOGLE_APPLICATION_CREDENTIALS=... npx tsx scripts/release-discovery-probe.ts
 */
import { FirebaseAdminProvider } from '../backend-lib/firebase/FirebaseAdminProvider.js';
import { loadMarketplaceRestaurants } from '../backend-lib/marketplace/projectDiscovery.js';
import { loadVisibleDiscoveryProfiles } from '../backend-lib/marketplace/discoveryProfileWriter.js';

async function main() {
  const coords = {
    lat: Number(process.argv[2] ?? '18.49959440695956'),
    lng: Number(process.argv[3] ?? '73.97858993491619'),
  };

  const provider = await FirebaseAdminProvider.initialize({ skipProbe: true });
  const db = provider.getFirestore();

  const visibleProfiles = await loadVisibleDiscoveryProfiles(db);
  const pool = await loadMarketplaceRestaurants(db, coords);

  console.log(
    JSON.stringify(
      {
        coords,
        visibleProfileCount: visibleProfiles.length,
        visibleProfileIds: visibleProfiles.map((p) => p.tenantId),
        poolCount: pool.restaurants.length,
        poolSlugs: pool.restaurants.map((r) => r.restaurantSlug),
        poolSyncRevision: pool.poolSyncRevision,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
