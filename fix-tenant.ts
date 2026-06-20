import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Read config from firebase-applet-config.json
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const configStr = fs.readFileSync(configPath, 'utf-8');
const firebaseConfig = JSON.parse(configStr);

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function fixTenant() {
  const tenantId = 'inti-bojanam-pune';
  
  try {
    console.log(`Creating tenant document for: ${tenantId}...`);
    
    await setDoc(doc(db, 'tenants', tenantId), {
      name: "Inti Bojanam Pune",
      slug: tenantId,
      ownerId: "Fc56iTND1bWMQnPu4am3t3uQUTy1", // The UID from the user's previous message
      status: 'active',
      branding: {
        primaryColor: '#ef4444',
        logoUrl: ''
      },
      createdAt: new Date()
    });
    
    console.log('✅ Tenant document created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create tenant:', error);
    process.exit(1);
  }
}

fixTenant();
