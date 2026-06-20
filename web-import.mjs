import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the standard Web SDK config from your applet config
const configPath = path.join(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log("Initializing Firebase Web SDK with project:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TENANT_ID = 'mana-inti';

async function runImport() {
  try {
    console.log("Reading menu.json...");
    const menuData = JSON.parse(fs.readFileSync(path.join(__dirname, 'menu.json'), 'utf8'));
    
    console.log("Importing menu items...");
    let menuBatch = writeBatch(db);
    let count = 0;
    
    for (const item of menuData) {
      const itemRef = doc(db, 'menu', item.id);
      menuBatch.set(itemRef, { ...item, tenantId: TENANT_ID });
      count++;
      
      if (count % 400 === 0) {
        await menuBatch.commit();
        menuBatch = writeBatch(db);
      }
    }
    if (count % 400 !== 0) await menuBatch.commit();
    console.log(`Successfully imported ${count} menu items!`);

    console.log("Reading accounts.json...");
    const accountsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'accounts.json'), 'utf8'));
    const usersList = accountsData.users || [];
    
    console.log(`Importing ${usersList.length} users...`);
    let userBatch = writeBatch(db);
    let userCount = 0;
    
    for (const u of usersList) {
      if (!u.localId) continue;
      const userRef = doc(db, 'users', u.localId);
      userBatch.set(userRef, {
        userId: u.localId,
        email: u.email || '',
        name: u.displayName || '',
        role: 'customer',
        createdAt: new Date()
      }, { merge: true });
      userCount++;
      
      if (userCount % 400 === 0) {
        await userBatch.commit();
        userBatch = writeBatch(db);
      }
    }
    if (userCount % 400 !== 0) await userBatch.commit();
    console.log(`Successfully imported ${userCount} users!`);
    
    console.log("ALL DATA IMPORTED SUCCESSFULLY!");
    process.exit(0);
  } catch (error) {
    console.error("IMPORT FAILED:", error);
    process.exit(1);
  }
}

runImport();
