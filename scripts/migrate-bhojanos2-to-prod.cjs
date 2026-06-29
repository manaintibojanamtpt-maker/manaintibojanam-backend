/**
 * Copy superadmin dashboard data from bhojanos2 → bhojanos-prod.
 *
 * Local usage (service account JSON files — never commit):
 *   set SOURCE_SA_PATH=.\secrets\bhojanos2-sa.json
 *   set TARGET_SA_PATH=.\secrets\bhojanos-prod-sa.json
 *   node scripts/migrate-bhojanos2-to-prod.cjs --dry-run
 *   node scripts/migrate-bhojanos2-to-prod.cjs --execute
 *
 * Or inline JSON env vars (same as Render):
 *   set SOURCE_FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
 *   set FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
 */
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const SOURCE_PROJECT = process.env.SOURCE_FIREBASE_PROJECT_ID || 'bhojanos2';
const TARGET_PROJECT = process.env.TARGET_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'bhojanos-prod';
const DEFAULT_COLLECTIONS = ['tenants', 'salesPipeline', 'release_notes', 'users'];

function loadServiceAccount(envKey, fileEnvKey) {
  const inline = process.env[envKey];
  if (inline) return JSON.parse(inline);
  const filePath = process.env[fileEnvKey];
  if (filePath) {
    return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
  }
  return null;
}

function getDb(appName, projectId, serviceAccount) {
  const existing = admin.apps.find((a) => a && a.name === appName);
  const app =
    existing ||
    admin.initializeApp(
      { credential: admin.credential.cert(serviceAccount), projectId },
      appName,
    );
  return getFirestore(app);
}

async function copyCollection(sourceDb, targetDb, name, { dryRun, merge }) {
  const snap = await sourceDb.collection(name).get();
  console.log(`  ${name}: ${snap.size} document(s) in source`);
  if (dryRun) return { collection: name, count: snap.size, dryRun: true };

  let written = 0;
  let batch = targetDb.batch();
  let batchSize = 0;
  for (const doc of snap.docs) {
    batch.set(targetDb.collection(name).doc(doc.id), doc.data(), { merge });
    batchSize += 1;
    written += 1;
    if (batchSize >= 400) {
      await batch.commit();
      batch = targetDb.batch();
      batchSize = 0;
    }
  }
  if (batchSize > 0) await batch.commit();
  return { collection: name, count: written, dryRun: false };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const execute = args.includes('--execute');
  if (!dryRun && !execute) {
    console.error('Pass --dry-run or --execute');
    process.exit(1);
  }

  const collectionsArg = args.find((a) => a.startsWith('--collections='));
  const collections = collectionsArg
    ? collectionsArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_COLLECTIONS;

  const sourceSa = loadServiceAccount('SOURCE_FIREBASE_SERVICE_ACCOUNT', 'SOURCE_SA_PATH');
  const targetSa = loadServiceAccount('FIREBASE_SERVICE_ACCOUNT', 'TARGET_SA_PATH');

  if (!sourceSa) {
    console.error('Missing SOURCE_FIREBASE_SERVICE_ACCOUNT or SOURCE_SA_PATH (bhojanos2 key).');
    process.exit(1);
  }
  if (!targetSa && !execute) {
    console.warn('TARGET_SA_PATH not set — dry-run only needs source credentials.');
  }
  if (execute && !targetSa) {
    console.error('Missing FIREBASE_SERVICE_ACCOUNT or TARGET_SA_PATH (bhojanos-prod key).');
    process.exit(1);
  }

  console.log(`Source: ${SOURCE_PROJECT}`);
  console.log(`Target: ${TARGET_PROJECT}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`Collections: ${collections.join(', ')}`);

  const sourceDb = getDb('migrate-source', SOURCE_PROJECT, sourceSa);
  const targetDb = execute ? getDb('migrate-target', TARGET_PROJECT, targetSa) : null;

  const results = [];
  for (const name of collections) {
    results.push(
      await copyCollection(sourceDb, targetDb || sourceDb, name, {
        dryRun: dryRun || !targetDb,
        merge: true,
      }),
    );
  }

  console.log('\nResults:', JSON.stringify(results, null, 2));
  if (dryRun) {
    console.log('\nDry run OK. Re-run with --execute to copy into bhojanos-prod.');
  } else {
    console.log('\nDone. Open /super-admin and sync. Re-link owners on prod Auth if needed.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
