import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const configStr = fs.readFileSync(configPath, 'utf-8');
const firebaseConfig = JSON.parse(configStr);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkTenant() {
  try {
    const slug = 'inti-bojanam-pune';
    console.log(`Checking tenant document for slug: ${slug}`);
    
    const tenantRef = doc(db, 'tenants', slug);
    const tenantDoc = await getDoc(tenantRef);
    
    if (tenantDoc.exists()) {
      console.log('✅ Tenant document exists directly at /tenants/' + slug);
      console.log(tenantDoc.data());
    } else {
      console.log('❌ Tenant document NOT FOUND at /tenants/' + slug);
    }
    
    console.log('Checking via query...');
    const q = query(collection(db, 'tenants'), where('slug', '==', slug));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      console.log(`✅ Query found ${snapshot.size} documents!`);
      snapshot.forEach(doc => {
        console.log(doc.id, '=>', doc.data());
      });
    } else {
      console.log('❌ Query returned empty!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTenant();
