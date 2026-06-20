const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'service-account.json'), 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

async function fix() {
  try {
    const userRecord = await auth.getUserByEmail('intibojanampune@gmail.com');
    console.log('Found user:', userRecord.uid);
    
    // Find tenant
    const tenantsSnap = await db.collection('tenants').where('contact.email', '==', 'intibojanampune@gmail.com').get();
    let tenantId = 'inti-bojanam-ghar-ka-kahan'; // fallback
    if (!tenantsSnap.empty) {
      tenantId = tenantsSnap.docs[0].id;
    } else {
      // try without .com
      const tenantsSnap2 = await db.collection('tenants').where('contact.email', '==', 'intibojanampune@gmail').get();
      if (!tenantsSnap2.empty) tenantId = tenantsSnap2.docs[0].id;
    }
    
    console.log('Using tenantId:', tenantId);
    
    await db.collection('users').doc(userRecord.uid).update({
      role: 'owner',
      tenantId: tenantId,
      ownedTenantIds: [tenantId]
    });
    console.log('Fixed user document!');
  } catch (e) {
    console.error(e);
  }
}
fix();
