import { FirebaseAdminProvider } from '../backend-lib/firebase/FirebaseAdminProvider.js';
import { removeTenantDiscoveryProfile } from '../backend-lib/marketplace/discoveryProfileWriter.js';

async function main() {
  const provider = await FirebaseAdminProvider.initialize({ skipProbe: true });
  const db = provider.getFirestore();
  await removeTenantDiscoveryProfile(db, 'uat-sandbox-kitchen');
  console.log('removed discovery_profiles/uat-sandbox-kitchen');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
