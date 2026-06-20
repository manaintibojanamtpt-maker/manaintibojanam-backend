import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

async function createSuperAdmin(email) {
  try {
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;
    console.log(`Found user ${email} with UID: ${uid}`);

    // Create or update the user document in Firestore
    await db.collection('users').doc(uid).set({
      userId: uid,
      email: email,
      role: 'superadmin',
      name: userRecord.displayName || 'BhojanOS Super Admin',
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`Successfully made ${email} a superadmin in Firestore!`);
  } catch (error) {
    console.error('Error:', error);
  }
}

const targetEmail = process.argv[2] || 'manaintibojanamtpt@gmail.com';
createSuperAdmin(targetEmail);
