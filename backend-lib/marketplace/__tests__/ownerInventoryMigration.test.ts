import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { computeMenuStockUpdate } from '../ownerMenuRoutes.js';

describe('owner menu stock API migration', () => {
  it('registers authenticated menu stock update route', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/ownerMenuRoutes.ts'),
      'utf8',
    );
    assert.match(source, /app\.put\('\/api\/owner\/menu\/items\/:id\/stock'/);
    assert.match(source, /assertOwnerTenantAccess/);
    assert.match(source, /publishTenantDomainEvent/);
  });

  it('registers owner menu routes in server bootstrap', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
    assert.match(source, /registerOwnerMenuRoutes/);
  });

  it('inventory forecast loads menu via owner menu API', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/services/InventoryForecastService.ts'),
      'utf8',
    );
    assert.match(source, /fetchOwnerMenuItems/);
    assert.doesNotMatch(source, /firebase\/firestore/);
    assert.doesNotMatch(source, /getDb\(\)/);
  });

  it('inventory service updates stock via owner menu API', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/services/InventoryService.ts'),
      'utf8',
    );
    assert.match(source, /updateOwnerMenuItemStock/);
    assert.doesNotMatch(source, /firebase\/firestore/);
    assert.doesNotMatch(source, /getDb\(\)/);
  });

  it('notification center loads menu count via owner menu API', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/modules/notifications/NotificationCenter.tsx'),
      'utf8',
    );
    assert.match(source, /fetchOwnerMenuItems/);
    assert.doesNotMatch(source, /getDb\(\)/);
    assert.doesNotMatch(source, /getCountFromServer/);
  });

  it('owner menu API exposes stock update helper', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/ownerMenuApi.ts'),
      'utf8',
    );
    assert.match(source, /updateOwnerMenuItemStock/);
    assert.match(source, /\/api\/owner\/menu\/items\/\$\{/);
  });
});

describe('computeMenuStockUpdate', () => {
  it('reserves stock and auto-locks when enabled', () => {
    const result = computeMenuStockUpdate(
      { stockCount: 2, autoLockEnabled: true, isAvailable: true },
      'reserve',
      5,
    );
    assert.ok(result);
    assert.equal(result.stockCount, 0);
    assert.equal(result.updates.isAvailable, false);
    assert.deepEqual(result.sideEffects, ['autoLocked']);
  });

  it('releases stock and restocks when auto-lock was applied', () => {
    const result = computeMenuStockUpdate(
      { stockCount: 0, autoLockEnabled: true, isAvailable: false },
      'release',
      3,
    );
    assert.ok(result);
    assert.equal(result.stockCount, 3);
    assert.equal(result.updates.isAvailable, true);
    assert.deepEqual(result.sideEffects, ['itemRestocked']);
  });

  it('returns null when stock tracking is disabled', () => {
    assert.equal(computeMenuStockUpdate({ isAvailable: true }, 'reserve', 1), null);
  });
});
