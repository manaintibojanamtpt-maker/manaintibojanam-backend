#!/usr/bin/env tsx
import { FirebaseAdminProvider } from '../backend-lib/firebase/FirebaseAdminProvider.js';

const slug = process.argv[2] ?? 'inti-bhojanam-ghar-kha-khana-pune';

async function main() {
  const provider = await FirebaseAdminProvider.initialize({ skipProbe: true });
  const db = provider.getFirestore();
  const direct = await db.collection('tenants').doc(slug).get();
  const snap = direct.exists
    ? direct
    : (
        await db.collection('tenants').where('slug', '==', slug).limit(1).get()
      ).docs[0];

  if (!snap?.exists) {
    console.error('Tenant not found:', slug);
    process.exit(1);
  }

  const data = snap.data() as Record<string, unknown>;
  const pick = {
    id: snap.id,
    slug: data.slug,
    name: data.name,
    businessType: data.businessType,
    cuisineTags: data.cuisineTags,
    location: data.location,
    deliveryConfig: data.deliveryConfig,
    storeOperations: data.storeOperations,
    storeTiming: (data.settings as Record<string, unknown> | undefined)?.storeTiming,
    marketplace: data.marketplace,
  };
  console.log(JSON.stringify(pick, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
