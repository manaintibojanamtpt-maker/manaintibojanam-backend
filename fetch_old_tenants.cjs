const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Initialize Firebase with the OLD project ID
if (admin.apps.length === 0) {
  let projectId = 'mana-inti-bojanam-pune-492610';
  admin.initializeApp({ projectId });
}

const DATABASE_ID = 'ai-studio-3efd2980-c2f3-4286-8dff-afeca044d855';
const db = getFirestore(admin.app(), DATABASE_ID);

async function runBackup() {
  console.log(`\n📦 Fetching Old Tenants from: ${DATABASE_ID}`);
  const backupData = [];
  
  try {
    const snapshot = await db.collection('tenants').get();
    snapshot.forEach(doc => {
      backupData.push({ id: doc.id, ...doc.data() });
    });
    
    fs.writeFileSync('tenants_backup.json', JSON.stringify(backupData, null, 2));
    console.log(`✅ Saved ${snapshot.size} tenants to tenants_backup.json`);
  } catch (e) {
    console.error("Failed to fetch tenants from old DB:", e);
    
    // Try the default database if the named one fails
    console.log("\nAttempting to fetch from (default) database instead...");
    try {
      const defaultDb = getFirestore(admin.app());
      const snap2 = await defaultDb.collection('tenants').get();
      const backupData2 = [];
      snap2.forEach(doc => {
        backupData2.push({ id: doc.id, ...doc.data() });
      });
      fs.writeFileSync('tenants_backup.json', JSON.stringify(backupData2, null, 2));
      console.log(`✅ Saved ${snap2.size} tenants to tenants_backup.json`);
    } catch (e2) {
      console.error("Failed on default DB too:", e2);
    }
  }
  process.exit(0);
}

runBackup();
