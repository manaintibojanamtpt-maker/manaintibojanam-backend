/**
 * One-time Firebase Auth admin bootstrap — copy to create-admin.local.mjs (gitignored).
 *
 *   cp scripts/create-admin.example.mjs create-admin.local.mjs
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' node create-admin.local.mjs
 *
 * Uses firebase-applet-config.local.json or VITE_FIREBASE_* from environment.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

function loadFirebaseConfig() {
  const localConfig = join(root, 'firebase-applet-config.local.json');
  const exampleConfig = join(root, 'firebase-applet-config.prod.example.json');
  const legacyConfig = join(root, 'firebase-applet-config.json');
  const path = existsSync(localConfig)
    ? localConfig
    : existsSync(legacyConfig)
      ? legacyConfig
      : exampleConfig;
  return JSON.parse(readFileSync(path, 'utf8'));
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim();

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
  process.exit(1);
}

const app = initializeApp(loadFirebaseConfig());
const auth = getAuth(app);

async function main() {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('Admin user created:', userCredential.user.email);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      console.log('Admin login successful:', userCredential.user.email);
      return;
    }
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
