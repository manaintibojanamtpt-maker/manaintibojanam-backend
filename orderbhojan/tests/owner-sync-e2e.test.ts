import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('owner → OrderBhojan sync E2E contract', () => {
  it('defines 5s customer-visible SLA aligned with 3s revision polling', () => {
    const harnessPath = path.resolve(process.cwd(), '../scripts/e2e/e2eSyncLabHarness.ts');
    const source = fs.readFileSync(harnessPath, 'utf8');
    assert.match(source, /OWNER_MARKETPLACE_SYNC_SLA_MS = 5_000/);
    assert.match(source, /e2e-sync-lab/);

    const revisionHook = fs.readFileSync(
      path.join(process.cwd(), 'src/features/marketplace/hooks/useMarketplaceRevisionSync.ts'),
      'utf8',
    );
    assert.match(revisionHook, /3_000/);
  });

  it('ships Playwright runner and harness CLI actions', () => {
    const runner = path.join(process.cwd(), 'scripts/owner-sync-e2e.ts');
    assert.equal(fs.existsSync(runner), true);
    const runnerSource = fs.readFileSync(runner, 'utf8');
    assert.match(runnerSource, /runPublishSyncTest/);
    assert.match(runnerSource, /runEditSyncTest/);
    assert.match(runnerSource, /runMenuVariantSyncTest/);
    assert.match(runnerSource, /OWNER_MARKETPLACE_SYNC_SLA_MS/);
    assert.match(runnerSource, /updateE2eSyncLabMenuItemViaOwnerApi/);
    assert.match(runnerSource, /E2E_SYNC_LAB_VARIANT_HALF/);

    const harness = fs.readFileSync(
      path.resolve(process.cwd(), '../scripts/e2e/e2eSyncLabHarness.ts'),
      'utf8',
    );
    for (const action of [
      'prepare-draft',
      'publish',
      'unpublish',
      'update-name',
      'update-menu-options',
    ]) {
      assert.match(harness, new RegExp(`'${action}'`));
    }
    assert.match(harness, /updateE2eSyncLabMenuItemViaOwnerApi/);
    assert.match(harness, /\/api\/owner\/menu\/items\//);
    assert.match(harness, /variants/);
    assert.match(harness, /addonGroups/);
    assert.match(harness, /E2E_SYNC_LAB_VARIANT_HALF/);
    assert.match(harness, /E2E_SYNC_LAB_ADDON_RAITA/);
  });
});
