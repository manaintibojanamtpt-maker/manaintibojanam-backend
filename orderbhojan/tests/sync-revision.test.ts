import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('marketplace revision sync', () => {
  it('wires revision polling client and invalidation hook', () => {
    const root = process.cwd();
    assert.equal(
      fs.existsSync(path.join(root, 'src/features/marketplace/hooks/useMarketplaceRevisionSync.ts')),
      true,
    );
    const source = fs.readFileSync(
      path.join(root, 'src/features/marketplace/hooks/useMarketplaceRevisionSync.ts'),
      'utf8',
    );
    assert.match(source, /fetchMarketplacePoolRevision/);
    assert.match(source, /invalidateQueries/);
    assert.match(source, /15_000/);
  });
});
