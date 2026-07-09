#!/usr/bin/env tsx
/**
 * Firebase Admin + Firestore IAM diagnostic.
 * Usage: npm run check:firebase
 */
import {
  FirebaseAdminProvider,
  resolveFirebaseProjectId,
  resolveDatabaseId,
  resolveStorageBucket,
  resolveFirebaseCredential,
  detectApplicationDefaultCredentials,
  verifyFirestoreIamAccess,
} from '../backend-lib/firebase/FirebaseAdminProvider.js';

function pass(label: string) {
  console.log(`✔ ${label}`);
}

function fail(label: string, reason: string) {
  console.error(`✘ ${label}: ${reason}`);
}

async function main() {
  console.log('Firebase / Firestore authentication check\n');

  let projectId: string;
  try {
    projectId = resolveFirebaseProjectId();
    pass(`Project (${projectId})`);
  } catch (error) {
    fail('Project', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  pass(`Database (${resolveDatabaseId()})`);
  pass(`Storage bucket (${resolveStorageBucket(projectId)})`);

  let credential;
  try {
    credential = resolveFirebaseCredential(projectId);
    pass(`Credential source (${credential.source})`);
    pass(`Service account (${credential.serviceAccountEmail ?? 'ADC runtime'})`);
  } catch (error) {
    fail('Credential resolution', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const adcDetected = await detectApplicationDefaultCredentials();
  pass(`ADC detected (${adcDetected})`);

  try {
    const provider = await FirebaseAdminProvider.initialize({ skipProbe: true });
    const db = provider.getFirestore();
    const context = provider.getContext();

    try {
      await db.collection('adminSettings').limit(1).get();
      pass('Firestore read');
    } catch (error) {
      fail('Firestore read', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    try {
      await verifyFirestoreIamAccess(db, context);
      pass('Firestore write');
      pass('Firestore delete');
      pass('IAM result');
    } catch (error) {
      fail('IAM probe', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    console.log('\n✔ Authentication OK');
  } catch (error) {
    fail('FirebaseAdminProvider', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
