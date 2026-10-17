import { FirebaseAdminProvider } from '../backend-lib/firebase/FirebaseAdminProvider.js';

async function verify() {
  const provider = await FirebaseAdminProvider.initialize();
  const db = provider.getFirestore();

  console.log('\n======================================================');
  console.log('VERIFYING FIRESTORE EMULATOR TEST RECORDS');
  console.log('======================================================\n');

  // 1. Tenant
  const tenantDoc = await db.collection('tenants').doc('demo-biryani-house').get();
  if (!tenantDoc.exists) throw new Error('Tenant demo-biryani-house missing from emulator!');
  const tenantData = tenantDoc.data()!;
  console.log(`[VERIFIED] Tenant: "${tenantData.name}" (ID: demo-biryani-house, publicId: ${tenantData.marketplace?.publicRestaurantId}, status: ${tenantData.status})`);

  // 2. Menu Items in canonical collection 'menu'
  const menuSnap = await db.collection('menu').where('tenantId', '==', 'demo-biryani-house').get();
  console.log(`[VERIFIED] Menu Items: Found ${menuSnap.size} dishes for demo-biryani-house:`);
  menuSnap.docs.forEach((d) => {
    const item = d.data();
    console.log(`   - ${item.name} (price: ₹${item.price}, available: ${item.isAvailable}, variants: ${item.variants?.length || 0})`);
  });
  if (menuSnap.size < 2) throw new Error('Expected at least 2 dishes in menu collection');

  // 3. Customer 1
  const cust1 = await db.collection('users').doc('usr_test_customer').get();
  if (!cust1.exists) throw new Error('Customer usr_test_customer missing');
  console.log(`[VERIFIED] Customer 1: ${cust1.data()?.displayName} (${cust1.data()?.email}, role: ${cust1.data()?.role})`);

  // 4. Customer 2 (account switch target)
  const cust2 = await db.collection('users').doc('usr_test_customer_2').get();
  if (!cust2.exists) throw new Error('Customer usr_test_customer_2 missing');
  console.log(`[VERIFIED] Customer 2: ${cust2.data()?.displayName} (${cust2.data()?.email}, role: ${cust2.data()?.role})`);

  // 5. Owner
  const owner = await db.collection('users').doc('usr_test_owner').get();
  if (!owner.exists) throw new Error('Owner usr_test_owner missing');
  console.log(`[VERIFIED] Owner: ${owner.data()?.displayName} (${owner.data()?.email}, ownedTenants: ${JSON.stringify(owner.data()?.ownedTenantIds)})\n`);

  console.log('ALL EMULATOR RECORDS CONFIRMED PRESENT AND RETRIEVED SUCCESSFULLY.');
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
