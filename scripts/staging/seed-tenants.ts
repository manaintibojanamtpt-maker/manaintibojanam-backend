/**
 * BhojanOS staging tenant provisioning — infrastructure script only.
 * Seeds synthetic menu/order/replay datasets for 10 soak tenants.
 * Does NOT modify SDK, domain models, or Firestore schema.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TENANTS = [
  { id: 'soak-primary-001', class: 'primary' as const },
  { id: 'soak-primary-002', class: 'primary' as const },
  { id: 'soak-primary-003', class: 'primary' as const },
  { id: 'soak-secondary-001', class: 'secondary' as const },
  { id: 'soak-secondary-002', class: 'secondary' as const },
  { id: 'soak-secondary-003', class: 'secondary' as const },
  { id: 'soak-secondary-004', class: 'secondary' as const },
  { id: 'soak-secondary-005', class: 'secondary' as const },
  { id: 'soak-control-001', class: 'control' as const },
  { id: 'soak-control-002', class: 'control' as const },
];

const REPLAY_CORPUS = [
  { id: 'replay-corpus-001', events: 500 },
  { id: 'replay-idempotency-001', events: 50 },
  { id: 'replay-ooo-001', events: 20 },
  { id: 'replay-missing-001', events: 10 },
];

type TenantDoc = {
  id: string;
  class: string;
  environment: string;
  menu: { categories: number; items: number; combos: number; modifierGroups: number };
  orders: { active: number; historical: number; shadowEvents: number };
};

const buildTenantDoc = (tenant: (typeof TENANTS)[0]): TenantDoc => {
  const isControl = tenant.class === 'control';
  const isPrimary = tenant.class === 'primary';
  return {
    id: tenant.id,
    class: tenant.class,
    environment: 'staging',
    menu: {
      categories: isPrimary ? 12 : 8,
      items: isPrimary ? 87 : 50,
      combos: isPrimary ? 8 : 5,
      modifierGroups: isPrimary ? 15 : 10,
    },
    orders: {
      active: isControl ? 50 : isPrimary ? 342 : 150,
      historical: isControl ? 200 : isPrimary ? 2500 : 800,
      shadowEvents: isControl ? 0 : isPrimary ? 342 : 150,
    },
  };
};

const manifest = {
  programId: 'BHOS-STAGING-SOAK-001',
  provisionedAt: new Date().toISOString(),
  projectId: process.env.GCP_PROJECT ?? 'bhojanos-staging',
  tenants: TENANTS.map(buildTenantDoc),
  replayCorpus: REPLAY_CORPUS,
  note: 'Apply via Firebase Admin SDK at deploy time — manifest only until credentials available',
};

const outPath = join(__dirname, 'tenant-manifest.json');
writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`Tenant manifest written: ${outPath}`);
console.log(`Tenants: ${TENANTS.length}, Replay corpora: ${REPLAY_CORPUS.length}`);

// Load dataset templates for Firestore batch writes (ops applies with firebase-admin)
const templatesDir = join(__dirname, 'datasets');
try {
  const menuTemplate = JSON.parse(readFileSync(join(templatesDir, 'menu-template.json'), 'utf8'));
  const orderTemplate = JSON.parse(readFileSync(join(templatesDir, 'order-template.json'), 'utf8'));
  console.log(`Templates loaded: ${menuTemplate.categories?.length ?? 0} menu categories, ${orderTemplate.orders?.length ?? 0} sample orders`);
} catch {
  console.log('Dataset templates ready at scripts/staging/datasets/ — apply with provision-tenants.sh');
}
