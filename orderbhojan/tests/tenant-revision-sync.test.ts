import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('tenant revision sync', () => {
  it('wires per-slug revision polling and targeted invalidation', () => {
    const root = process.cwd();
    assert.equal(
      fs.existsSync(path.join(root, 'src/features/marketplace/hooks/useTenantRevisionSync.ts')),
      true,
    );
    const hookSource = fs.readFileSync(
      path.join(root, 'src/features/marketplace/hooks/useTenantRevisionSync.ts'),
      'utf8',
    );
    assert.match(hookSource, /fetchTenantSyncRevision/);
    assert.match(hookSource, /invalidateQueries/);
    assert.match(hookSource, /15_000/);

    const clientSource = fs.readFileSync(
      path.join(root, 'src/features/marketplace/infrastructure/marketplaceSyncClient.ts'),
      'utf8',
    );
    assert.match(clientSource, /sync\/revision\/\$\{encodeURIComponent\(slug\)\}/);
  });
});
