const admin = require('firebase-admin');
const { getFirestore, FieldPath } = require('firebase-admin/firestore');

if (admin.apps.length === 0) {
  let projectId = 'bhojanos2';
  admin.initializeApp({ projectId });
}

const db = getFirestore(admin.app());

async function run() {
  try {
    const ordersRef = db.collection('orders');
    const q = ordersRef
      .where('tenantId', '==', 'mana-inti')
      .where('status', 'not-in', ['DELIVERED', 'CANCELLED', 'EXPIRED', 'FAILED_DELIVERY']);
    
    await q.get();
    console.log("Success! Query ran fine.");
  } catch(e) {
    console.error("Failed:", e.message);
  }
}
run();
