import fs from 'fs';
import path from 'path';
import process from 'process';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'firebase-applet-config.json');

function loadAppConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Missing config file: ${CONFIG_PATH}`);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function buildCredential() {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (rawServiceAccount) {
    return cert(JSON.parse(rawServiceAccount));
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath && fs.existsSync(credentialsPath)) {
    return cert(JSON.parse(fs.readFileSync(credentialsPath, 'utf8')));
  }

  throw new Error(
    'No Firebase admin credentials found. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS before running this read-only audit.'
  );
}

function normalizeValue(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (typeof value !== 'object') return value;

  if (typeof value.toDate === 'function') {
    try {
      return value.toDate().toISOString();
    } catch {
      return String(value);
    }
  }

  const out = {};
  for (const [key, nested] of Object.entries(value)) {
    out[key] = normalizeValue(nested);
  }
  return out;
}

function summarizeDocs(collectionName, docs) {
  const fieldNames = new Set();
  const statusValues = new Set();
  const paymentStatusValues = new Set();
  const tokenFieldPresence = { deviceTokens: 0, fcmTokens: 0 };

  for (const snap of docs) {
    const data = snap.data() || {};
    Object.keys(data).forEach((key) => fieldNames.add(key));

    if (typeof data.status === 'string') statusValues.add(data.status);
    if (typeof data.paymentStatus === 'string') paymentStatusValues.add(data.paymentStatus);
    if (Array.isArray(data.deviceTokens)) tokenFieldPresence.deviceTokens += 1;
    if (Array.isArray(data.fcmTokens)) tokenFieldPresence.fcmTokens += 1;
  }

  return {
    collection: collectionName,
    sampledDocs: docs.length,
    fieldsObserved: Array.from(fieldNames).sort(),
    statusValues: Array.from(statusValues).sort(),
    paymentStatusValues: Array.from(paymentStatusValues).sort(),
    tokenFieldPresence,
    sampleDocIds: docs.map((snap) => snap.id),
  };
}

async function sampleCollection(db, collectionName, count = 3) {
  const snapshot = await db.collection(collectionName).limit(count).get();
  return snapshot.docs;
}

async function readAdminSettings(db) {
  const doc = await db.collection('adminSettings').doc('global').get();
  return doc.exists ? normalizeValue(doc.data()) : null;
}

async function main() {
  const config = loadAppConfig();
  const projectId = config.projectId;
  const databaseId = config.firestoreDatabaseId || '(default)';

  if (!projectId) {
    throw new Error('Missing projectId in firebase-applet-config.json');
  }

  const credential = buildCredential();
  const app = initializeApp({ credential, projectId });
  const db = databaseId && databaseId !== '(default)'
    ? getFirestore(app, databaseId)
    : getFirestore(app);

  const collections = [
    'users',
    'orders',
    'paymentProofs',
    'coupons',
    'supportTickets',
    'banners',
    'categories',
    'reviews',
    'razorpayWebhooks',
  ];

  const report = {
    projectId,
    databaseId,
    generatedAt: new Date().toISOString(),
    collections: {},
    adminSettings: null,
    samples: {},
  };

  for (const collectionName of collections) {
    try {
      const docs = await sampleCollection(db, collectionName, 3);
      report.collections[collectionName] = summarizeDocs(collectionName, docs);
      report.samples[collectionName] = docs.map((snap) => ({
        id: snap.id,
        data: normalizeValue(snap.data()),
      }));
    } catch (error) {
      report.collections[collectionName] = {
        collection: collectionName,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  try {
    report.adminSettings = await readAdminSettings(db);
  } catch (error) {
    report.adminSettings = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error('[read_prod_audit] Failed:', error instanceof Error ? error.message : String(error));
  console.error('This script is read-only, but it requires valid Firebase admin credentials to inspect production.');
  process.exit(1);
});
