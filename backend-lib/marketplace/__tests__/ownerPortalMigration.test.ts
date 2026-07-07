import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('owner portal API migration', () => {
  it('registers authenticated owner portal routes', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/ownerPortalRoutes.ts'),
      'utf8',
    );
    for (const route of [
      "app.get('/api/owner/referrals'",
      "app.post('/api/owner/campaigns'",
      "app.put('/api/owner/kyc/profile'",
      "app.put('/api/owner/kyc/declaration'",
      "app.get('/api/owner/release-notes/latest'",
      "app.patch('/api/owner/tenant/preferences'",
      "app.post('/api/owner/feedback'",
    ]) {
      assert.match(source, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.match(source, /assertOwnerTenantAccess/);
  });

  it('KYC page uses owner portal API instead of Firestore', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/pages/owner/OwnerKYC.tsx'), 'utf8');
    assert.match(source, /saveOwnerKycProfile|acceptOwnerKycDeclaration/);
    assert.doesNotMatch(source, /firebase\/firestore/);
    assert.doesNotMatch(source, /getDb\(\)/);
  });

  it('dashboard uses portal API for release notes and tenant preferences', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/pages/owner/OwnerDashboard.tsx'), 'utf8');
    assert.match(source, /fetchLatestReleaseNote/);
    assert.match(source, /updateOwnerTenantPreferences/);
    assert.match(source, /fetchOwnerMenuItems/);
    assert.match(source, /ownerApiRequest/);
    assert.doesNotMatch(source, /firebase\/firestore/);
    assert.doesNotMatch(source, /getDb\(\)/);
  });

  it('feedback page uses owner portal API instead of Firestore', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/pages/owner/OwnerFeedback.tsx'), 'utf8');
    assert.match(source, /submitOwnerFeedback/);
    assert.doesNotMatch(source, /firebase\/firestore/);
  });

  it('referrals page uses owner portal API instead of Firestore', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/pages/owner/OwnerReferrals.tsx'), 'utf8');
    assert.match(source, /fetchOwnerReferrals/);
    assert.doesNotMatch(source, /firebase\/firestore/);
  });

  it('marketing page launches campaigns via owner portal API', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/pages/owner/OwnerMarketing.tsx'), 'utf8');
    assert.match(source, /launchOwnerCampaign/);
    assert.doesNotMatch(source, /firebase\/firestore/);
  });
});
