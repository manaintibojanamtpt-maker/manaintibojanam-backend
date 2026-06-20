const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Initialize Firebase
if (admin.apps.length === 0) {
  let projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        projectId = firebaseConfig.projectId;
      }
    } catch (e) {}
  }
  if (!projectId) projectId = 'mana-inti-bojanam-pune-492610';
  admin.initializeApp({ projectId });
}

const DATABASE_ID = 'ai-studio-3efd2980-c2f3-4286-8dff-afeca044d855';
const db = getFirestore(admin.app(), DATABASE_ID);

const COLLECTIONS_TO_BACKUP = [
  'menu', 'categories', 'orders', 'order_drafts', 'subscriptions', 'users',
  'supportTickets', 'courierDispatches', 'reviews', 'referrals',
  'coupons', 'banners', 'userPreferences', 'paymentProofs', 
  'notification_outbox', 'webhook_events', 'razorpayWebhooks'
];

const BACKUP_DIR = path.join(process.cwd(), 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFilePath = path.join(BACKUP_DIR, `firestore_backup_${timestamp}.json`);

async function runBackup() {
  console.log(`\n📦 Starting Local Firestore Backup (Target: ${DATABASE_ID})`);
  const backupData = {};
  let totalDocs = 0;

  for (const collectionName of COLLECTIONS_TO_BACKUP) {
    process.stdout.write(`Fetching /${collectionName}... `);
    const snapshot = await db.collection(collectionName).get();
    
    backupData[collectionName] = {};
    snapshot.forEach(doc => {
      backupData[collectionName][doc.id] = doc.data();
      totalDocs++;
    });
    
    console.log(`Saved ${snapshot.size} docs.`);
  }

  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
  
  console.log('\n=================================================');
  console.log(`✅ Backup complete!`);
  console.log(`Total Collections: ${COLLECTIONS_TO_BACKUP.length}`);
  console.log(`Total Documents:   ${totalDocs}`);
  console.log(`File Saved To:     ${backupFilePath}`);
  console.log('=================================================\n');
  process.exit(0);
}

runBackup().catch(err => {
  console.error("❌ Backup failed:", err);
  process.exit(1);
});
