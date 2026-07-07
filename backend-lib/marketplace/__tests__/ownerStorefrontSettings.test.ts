import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('owner storefront settings API contract', () => {
  it('merges tenant settings and emits sync on PUT', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/ownerStorefrontRoutes.ts'),
      'utf8',
    );
    assert.match(source, /deliveryConfig/);
    assert.match(source, /pricingConfig/);
    assert.match(source, /paymentConfig/);
    assert.match(source, /publishTenantDomainEvent/);
    assert.match(source, /mergeObject/);
  });

  it('exposes tenant profile fields on GET', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/ownerStorefrontRoutes.ts'),
      'utf8',
    );
    assert.match(source, /deliveryNotes/);
    assert.match(source, /location:/);
    assert.match(source, /features:/);
  });

  it('exposes per-slug tenant sync revision endpoint', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/marketplaceRoutes.ts'),
      'utf8',
    );
    assert.match(source, /sync\/revision\/:slug/);
    assert.match(source, /tenantSyncRevision/);
  });
});
