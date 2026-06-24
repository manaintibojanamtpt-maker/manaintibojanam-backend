const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (err) {
    console.error("Failed to initialize Firebase Admin:", err.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function resolveErrors() {
  console.log('Fetching open client errors...');
  const snapshot = await db.collection('client_errors').where('resolved', '==', false).get();
  
  if (snapshot.empty) {
    console.log('Checking for errors without resolved field...');
    const snapshot2 = await db.collection('client_errors').get();
    let count = 0;
    const batch = db.batch();
    snapshot2.docs.forEach((doc) => {
      if (doc.data().resolved !== true) {
        batch.update(doc.ref, { resolved: true });
        count++;
      }
    });
    if (count > 0) {
      console.log(`Resolving ${count} incidents without resolved=true flag...`);
      await batch.commit();
      console.log('Done resolving.');
    } else {
      console.log('No open incidents found.');
    }
    process.exit(0);
  }

  console.log(`Found ${snapshot.size} open incidents. Resolving them now...`);
  const batch = db.batch();
  
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { resolved: true });
  });

  await batch.commit();
  console.log('All incidents successfully marked as resolved in the database.');
  process.exit(0);
}

resolveErrors().catch(err => {
  console.error(err);
  process.exit(1);
});
