const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: 'bhojanos2' });
}

const db = admin.firestore();

async function main() {
  const tenants = await db.collection('tenants').get();
  console.log(`Found ${tenants.size} tenants:`);
  tenants.forEach(doc => console.log(doc.id, doc.data().name));
}

main().catch(console.error);
