const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (err) {
    console.error("Failed to initialize Firebase Admin:", err.message);
    console.error("Make sure GOOGLE_APPLICATION_CREDENTIALS environment variable is set.");
    process.exit(1);
  }
}

const db = admin.firestore();

const releases = [
  {
    version: '1.0.0',
    title: 'Founder Beta Launch',
    summary: 'The initial launch of BhojanOS for Founder Beta merchants.',
    category: 'merchant_growth',
    highlights: ['Platform launched for initial merchants', 'Core storefront live'],
    isPublished: true,
    publishedAt: new Date(Date.now() - 5 * 86400000),
    publishedBy: 'system'
  },
  {
    version: '1.0.1',
    title: 'Security Hardening Update',
    summary: 'Critical security patches and multi-tenant isolation.',
    category: 'security',
    highlights: ['Tenant data isolation enforced', 'SuperAdmin escalation prevented', 'Document security rules updated'],
    isPublished: true,
    publishedAt: new Date(Date.now() - 4 * 86400000),
    publishedBy: 'system'
  },
  {
    version: '1.0.2',
    title: 'Performance Optimization Update',
    summary: 'Significant improvements to database reads and storefront load times.',
    category: 'performance',
    highlights: ['Removed unnecessary realtime listeners', 'Optimized database queries'],
    isPublished: true,
    publishedAt: new Date(Date.now() - 3 * 86400000),
    publishedBy: 'system'
  },
  {
    version: '1.0.3',
    title: 'Checkout Simplification Update',
    summary: 'Streamlined checkout process and delivery location mapping.',
    category: 'storefront',
    highlights: ['Improved map selection', 'Faster checkout flow'],
    isPublished: true,
    publishedAt: new Date(Date.now() - 2 * 86400000),
    publishedBy: 'system'
  },
  {
    version: '1.0.4',
    title: 'Merchant Activation Update',
    summary: 'Removed onboarding friction for sandbox activation.',
    category: 'merchant_growth',
    highlights: ['Email verification no longer blocks sandbox', 'Optional KYC messaging updated'],
    isPublished: true,
    publishedAt: new Date(Date.now() - 1 * 86400000),
    publishedBy: 'system'
  },
  {
    version: '1.0.5',
    title: 'Founder Beta Stability Update',
    summary: 'Comprehensive stability update incorporating all recent PMF validation feedback.',
    category: 'stability',
    highlights: [
      'Faster storefront loading',
      'Checkout performance improvements',
      'Simplified delivery location workflow',
      'Security hardening enhancements',
      'Merchant onboarding improvements',
      'Sandbox activation improvements',
      'Reduced Firestore read costs',
      'Platform stability enhancements'
    ],
    isPublished: true,
    publishedAt: new Date(Date.now() - 3600000), // 1 hour ago
    publishedBy: 'system'
  },
  {
    version: '1.0.6',
    title: 'Founder Beta Communication Update',
    summary: 'A new Release Center has been added to improve merchant communication and transparency.',
    category: 'merchant_growth',
    highlights: [
      'New Release Center',
      'Product Update Feed',
      'Merchant Communication Improvements',
      'Faster Storefront Experience',
      'Security Hardening Updates',
      'Stability Improvements'
    ],
    isPublished: true,
    publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    publishedBy: 'system'
  }
];

async function seed() {
  console.log('Seeding release notes...');
  for (const release of releases) {
    console.log(`Seeding v${release.version}...`);
    await db.collection('release_notes').add(release);
  }
  console.log('Done seeding release notes.');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
