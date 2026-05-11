import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load Firebase config
const firebaseConfig = JSON.parse(readFileSync(join(__dirname, 'firebase-applet-config.json'), 'utf8'));

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const ADMIN_EMAIL = 'manaintibojanamtpt@gmail.com';
const ADMIN_PASSWORD = 'Kalyan@1990@@'; // Change this to a secure password

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('Admin user created successfully:', userCredential.user.email);
    console.log('User ID:', userCredential.user.uid);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Admin user already exists. Testing login...');
      try {
        const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('Admin login successful:', userCredential.user.email);
      } catch (loginError) {
        console.error('Admin login failed:', loginError.message);
        console.log('Try changing the password in this script and run again.');
      }
    } else {
      console.error('Error creating admin user:', error.message);
    }
  }
}

createAdminUser();