import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../../..');

describe('SubscriptionPage referral migration', () => {
  it('uses marketplace referrals API instead of client Firestore query', () => {
    const page = readFileSync(join(root, 'src/pages/SubscriptionPage.tsx'), 'utf8');
    assert.match(page, /applyMarketplaceReferralCode/);
    assert.doesNotMatch(page, /collection\(getDb\(\), 'referrals'\)/);
    assert.doesNotMatch(page, /updateDoc\(doc\(getDb\(\), 'referrals'/);
  });

  it('exposes marketplace referral apply helper', () => {
    const helper = readFileSync(join(root, 'src/lib/marketplaceReferralApi.ts'), 'utf8');
    assert.match(helper, /\/api\/marketplace\/referrals\/apply/);
  });
});
