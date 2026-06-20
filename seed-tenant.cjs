const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  let projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) projectId = 'mana-inti-bojanam-pune-492610'; 
  admin.initializeApp({ projectId });
}

const db = admin.firestore();

async function seedTenant() {
  console.log("Seeding Tenant Document for Mana Inti...");
  const tenantRef = db.collection('tenants').doc('mana-inti');
  
  await tenantRef.set({
    id: "mana-inti",
    slug: "mana-inti",
    name: "Mana Inti Bojanam",
    ownerId: "SYSTEM_SEEDED",
    isActive: true,
    planId: "enterprise",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    paymentConfig: {
      provider: "razorpay",
      keyId: "placeholder_to_be_replaced", // Will fetch from env for Phase 0 fallback
      secretRef: "projects/YOUR_PROJECT/secrets/RAZORPAY_SECRET/versions/latest", // Protected secret reference
      isActive: true
    },
    brandConfig: {
      logoUrl: "",
      primaryColor: "#ff5722"
    }
  }, { merge: true });

  console.log("✅ Seed complete. Document created at /tenants/mana-inti");
  process.exit(0);
}

seedTenant().catch(console.error);
