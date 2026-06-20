import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';

import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'service-account.json'), 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

async function run() {
  try {
    const userRecord = await auth.getUserByEmail('intibojanampune@gmail.com');
    console.log('User UID:', userRecord.uid);
    const doc = await db.collection('users').doc(userRecord.uid).get();
    console.log('User Document:', doc.data());
  } catch (e) {
    console.log('Error finding user intibojanampune@gmail.com', e);
  }
  
  try {
    const userRecord2 = await auth.getUserByEmail('intibojanampune@gmail');
    console.log('User UID 2:', userRecord2.uid);
    const doc2 = await db.collection('users').doc(userRecord2.uid).get();
    console.log('User Document 2:', doc2.data());
  } catch (e) {
    console.log('Error finding user intibojanampune@gmail', e);
  }
}

run();
