const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (admin.apps.length === 0) {
  let projectId = process.env.FIREBASE_PROJECT_ID || 'bhojanos2';
  admin.initializeApp({ projectId });
}

const db = getFirestore();

async function checkData() {
  console.log(`\n📦 Checking Data in bhojanos2 (default db)`);
  
  const tenants = await db.collection('tenants').get();
  console.log(`\nTenants: ${tenants.size}`);
  tenants.forEach(doc => console.log(' -', doc.id, doc.data().name, 'Status:', doc.data().status));

  const menu = await db.collection('menu').get();
  console.log(`\nMenu Items: ${menu.size}`);
  
  if (menu.size > 0) {
    console.log('Sample menu item:', menu.docs[0].data());
  }

  process.exit(0);
}

checkData().catch(console.error);
