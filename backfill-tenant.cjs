const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const TARGET_TENANT_ID = 'mana-inti';
const BATCH_SIZE = 500;
const LOG_FILE = path.join(__dirname, `backfill_failures_${Date.now()}.log`);

if (admin.apps.length === 0) {
  let projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        projectId = firebaseConfig.projectId;
      }
    } catch (e) {
      console.warn("Could not read firebase-applet-config.json");
    }
  }
  if (!projectId) projectId = 'mana-inti-bojanam-pune-492610'; // Fallback to original project
  
  admin.initializeApp({ projectId });
}

const DATABASE_ID = 'ai-studio-3efd2980-c2f3-4286-8dff-afeca044d855';
const db = getFirestore(admin.app(), DATABASE_ID);

console.log(`\n[INIT] Project ID: ${admin.app().options.projectId}`);
console.log(`[INIT] Database ID: ${DATABASE_ID}`);

// Collections to backfill
const CRITICAL_COLLECTIONS = ['menu', 'categories', 'orders', 'order_drafts', 'subscriptions'];
const SECONDARY_COLLECTIONS = [
  'users', 
  'supportTickets', 
  'courierDispatches', 
  'reviews', 
  'referrals',
  'coupons', 
  'banners', 
  'userPreferences', 
  'paymentProofs', 
  'notification_outbox', 
  'webhook_events', 
  'razorpayWebhooks'
];
const COLLECTIONS_TO_BACKFILL = [...CRITICAL_COLLECTIONS, ...SECONDARY_COLLECTIONS];

const failedDocs = [];

function logFailure(collection, docId, error) {
  const logEntry = `[${new Date().toISOString()}] Collection: ${collection} | DocID: ${docId} | Error: ${error}\n`;
  fs.appendFileSync(LOG_FILE, logEntry);
  failedDocs.push({ collection, docId, error });
}

async function backfillCollection(collectionName) {
  console.log(`\n--- Starting backfill for: ${collectionName} ---`);
  const collectionRef = db.collection(collectionName);
  
  let totalCount = 0;
  let alreadyHasTenant = 0;
  let missingTenantCount = 0;
  let updatedCount = 0;
  let failedCount = 0;
  
  let hasMore = true;
  let lastDoc = null;

  while (hasMore) {
    let query = collectionRef.orderBy(admin.firestore.FieldPath.documentId()).limit(BATCH_SIZE);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    if (snapshot.size < BATCH_SIZE) {
      hasMore = false;
    }

    const batch = db.batch();
    let batchUpdates = 0;

    for (const doc of snapshot.docs) {
      totalCount++;
      const data = doc.data();
      
      if (data.tenantId === TARGET_TENANT_ID) {
        alreadyHasTenant++;
      } else {
        missingTenantCount++;
        if (!DRY_RUN) {
          try {
            batch.update(doc.ref, { tenantId: TARGET_TENANT_ID });
            batchUpdates++;
          } catch (err) {
            failedCount++;
            logFailure(collectionName, doc.id, err.message);
          }
        }
      }
    }

    if (batchUpdates > 0 && !DRY_RUN) {
      try {
        await batch.commit();
        updatedCount += batchUpdates;
        console.log(`  Committed batch of ${batchUpdates} updates...`);
      } catch (err) {
        // If the whole batch fails, we log it and increment failure counts
        console.error(`  Batch commit failed: ${err.message}`);
        failedCount += batchUpdates;
        snapshot.docs.forEach(doc => {
          if (doc.data().tenantId !== TARGET_TENANT_ID) {
            logFailure(collectionName, doc.id, `Batch commit failed: ${err.message}`);
          }
        });
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  const isCritical = CRITICAL_COLLECTIONS.includes(collectionName);
  const coverage = totalCount === 0 ? 100 : Math.round(((alreadyHasTenant + updatedCount) / totalCount) * 100);

  return { 
    collection: collectionName + (isCritical ? ' (CRITICAL)' : ''), 
    total: totalCount, 
    missing: missingTenantCount,
    alreadyHas: alreadyHasTenant,
    updated: updatedCount,
    skipped: DRY_RUN ? missingTenantCount : 0,
    failed: failedCount,
    coverage: `${coverage}%`
  };
}

async function runBackfill() {
  console.log('🚀 Starting Tenant Backfill Script');
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (No changes will be saved)' : 'EXECUTION'}`);
  console.log(`Target Tenant ID: ${TARGET_TENANT_ID}`);
  console.log(`Logging failures to: ${LOG_FILE}\n`);

  // Touch the log file
  fs.writeFileSync(LOG_FILE, `--- Backfill Failure Log (${new Date().toISOString()}) ---\n`);

  const results = [];

  for (const collection of COLLECTIONS_TO_BACKFILL) {
    try {
      const result = await backfillCollection(collection);
      results.push(result);
    } catch (err) {
      console.error(`❌ Fatal Error in collection ${collection}:`, err.message);
    }
  }

  console.log('\n========================================================================================');
  console.log(`🎉 BACKFILL SUMMARY [${DRY_RUN ? 'DRY-RUN' : 'LIVE'}]`);
  console.log('========================================================================================');
  console.table(results);
  
  if (failedDocs.length > 0) {
    console.log(`\n⚠️ WARNING: ${failedDocs.length} documents failed to update. Check ${LOG_FILE} for details.`);
  }

  console.log('\nDone.');
  process.exit(0);
}

runBackfill().catch(console.error);
