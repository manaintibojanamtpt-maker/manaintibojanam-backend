const { initializeApp, cert } = require('firebase-admin/app');
const { getSecurityRules } = require('firebase-admin/security-rules');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'service-account.json'), 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

async function deployRules() {
  try {
    const rulesSource = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
    
    console.log('Creating ruleset...');
    const ruleset = await getSecurityRules(app).createRulesFileFromSource('firestore.rules', rulesSource);
    const created = await getSecurityRules(app).createRuleset(ruleset);
    
    console.log('Releasing ruleset...');
    await getSecurityRules(app).releaseFirestoreRuleset(created.name);
    
    console.log('✅ Firestore rules deployed successfully via Admin SDK!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to deploy rules:', error);
    process.exit(1);
  }
}

deployRules();
