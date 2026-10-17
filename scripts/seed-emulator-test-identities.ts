import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseAdminProvider } from '../backend-lib/firebase/FirebaseAdminProvider.js';

async function seed() {
  const provider = await FirebaseAdminProvider.initialize();
  const db = provider.getFirestore();

  console.log('Seeding customer and owner test identities into isolated emulator...');

  // 1. Customer user
  await db.collection('users').doc('usr_test_customer').set({
    uid: 'usr_test_customer',
    email: 'customer@demo.local',
    displayName: 'Test Customer',
    role: 'user',
    phone: '9876543210',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  // 2. Secondary customer user (for account switching validation)
  await db.collection('users').doc('usr_test_customer_2').set({
    uid: 'usr_test_customer_2',
    email: 'customer2@demo.local',
    displayName: 'Secondary Customer',
    role: 'user',
    phone: '9876543211',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  // 3. Owner user authorized for demo-biryani-house
  await db.collection('users').doc('usr_test_owner').set({
    uid: 'usr_test_owner',
    email: 'owner@demo.local',
    displayName: 'Demo Restaurant Owner',
    role: 'owner',
    ownedTenantIds: ['demo-biryani-house', 'obr_demo_biryani_001'],
    phone: '9876543220',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log('Seeded test users: usr_test_customer, usr_test_customer_2, usr_test_owner');
}

seed().catch((err) => {
  console.error('Failed to seed emulator test identities:', err);
  process.exit(1);
});
