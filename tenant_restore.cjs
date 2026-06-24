const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin (Make sure GOOGLE_APPLICATION_CREDENTIALS is set)
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (err) {
    console.error("Failed to initialize Firebase Admin:", err.message);
    console.error("Make sure GOOGLE_APPLICATION_CREDENTIALS environment variable is set.");
    process.exit(1);
  }
}

const db = admin.firestore();

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const tenantId = args.find(arg => !arg.startsWith('--'));

if (!tenantId) {
  console.error('Usage: node tenant_restore.cjs <tenantId> [--dry-run]');
  process.exit(1);
}

const backupDir = path.join(__dirname, 'tenant_backups');
const backupFilePattern = new RegExp(`^${tenantId}_.*\\.json$`);

async function restoreTenant() {
  console.log(`\n========================================`);
  console.log(`Starting restore for tenant: ${tenantId}`);
  if (isDryRun) console.log(`[DRY RUN] No changes will be written to Firestore`);
  console.log(`========================================\n`);

  try {
    const files = fs.readdirSync(backupDir);
    const backupFiles = files.filter(f => backupFilePattern.test(f)).sort().reverse();
    
    if (backupFiles.length === 0) {
      console.error(`No backup files found for tenant: ${tenantId} in ${backupDir}`);
      process.exit(1);
    }

    const latestBackupFile = path.join(backupDir, backupFiles[0]);
    console.log(`Found latest backup: ${backupFiles[0]}`);

    const backupData = JSON.parse(fs.readFileSync(latestBackupFile, 'utf-8'));
    
    let restoredCount = 0;
    let skippedCount = 0;
    
    // Check Tenant Document
    if (backupData.tenant) {
      const tenantRef = db.collection('tenants').doc(tenantId);
      const tenantSnap = await tenantRef.get();
      if (!tenantSnap.exists) {
        console.log(`Restoring tenant document: ${tenantId}`);
        if (!isDryRun) await tenantRef.set(backupData.tenant);
        restoredCount++;
      } else {
        console.log(`Tenant document ${tenantId} already exists. Skipping.`);
        skippedCount++;
      }
    }

    // Check Users
    if (backupData.users) {
      for (const [userId, userData] of Object.entries(backupData.users)) {
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
          console.log(`Restoring user: ${userId}`);
          if (!isDryRun) await userRef.set(userData);
          restoredCount++;
        } else {
          skippedCount++;
        }
      }
    }

    // Check Collections (Menu, Orders, Customers, etc.)
    const collectionsToRestore = ['menu', 'orders', 'customers', 'campaigns'];
    for (const collName of collectionsToRestore) {
      if (backupData[collName]) {
        for (const [docId, docData] of Object.entries(backupData[collName])) {
          const docRef = db.collection(collName).doc(docId);
          const docSnap = await docRef.get();
          if (!docSnap.exists) {
            console.log(`Restoring ${collName} document: ${docId}`);
            if (!isDryRun) await docRef.set(docData);
            restoredCount++;
          } else {
            skippedCount++;
          }
        }
      }
    }

    console.log(`\nRestore complete!`);
    console.log(`Restored records: ${restoredCount}`);
    console.log(`Skipped records (already exist): ${skippedCount}`);

  } catch (error) {
    console.error(`Restore failed: ${error.message}`);
    process.exit(1);
  }
}

restoreTenant();
