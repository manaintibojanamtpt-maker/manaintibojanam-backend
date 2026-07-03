import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PRICING_CATALOG_EVENT_TYPES,
  PRICING_CATALOG_READ_PROJECTION_VERSION,
  isSupportedPricingCatalogProjectionEvent,
} from '../PricingProjectionMetadata';
import {
  applyPricingCatalogProjectionDeleted,
  applyPricingCatalogProjectionUpdated,
  buildPricingCatalogProjectionFromCreated,
  resolvePricingCatalogProjectionTransition,
} from '../PricingProjectionBuilders';
import {
  assertNoForbiddenFieldsInPricingReadModel,
  canApplyPricingCatalogDelete,
  canApplyPricingCatalogUpdate,
  validatePricingCatalogProjectionEventType,
  validatePricingCatalogProjectionReadModel,
} from '../PricingProjectionValidation';

const baseContext = () => ({
  eventId: 'evt-pricing-001',
  eventType: PRICING_CATALOG_EVENT_TYPES.CREATED,
  schemaVersion: '1.0.0',
  occurredAt: '2026-07-03T10:00:00.000Z',
  branchId: 'branch-001',
});

const createdPayload = () => ({
  priceListId: 'pricelist-001',
  tenantId: 'tenant-001',
  pricingVersion: '1.0.0',
  status: 'ACTIVE',
  priceCount: 42,
  couponCount: 3,
  campaignCount: 2,
  offerCount: 1,
});

describe('Pricing catalog shadow projection domain (M8 PR-7)', () => {
  it('exports supported catalog event types', () => {
    assert.equal(PRICING_CATALOG_EVENT_TYPES.CREATED, 'pricing.catalog.created.v1');
    assert.equal(PRICING_CATALOG_EVENT_TYPES.UPDATED, 'pricing.catalog.updated.v1');
    assert.equal(PRICING_CATALOG_EVENT_TYPES.DELETED, 'pricing.catalog.deleted.v1');
    assert.equal(isSupportedPricingCatalogProjectionEvent('pricing.catalog.created.v1'), true);
    assert.equal(isSupportedPricingCatalogProjectionEvent('pricing.item.created.v1'), false);
  });

  it('buildPricingCatalogProjectionFromCreated builds metadata-only read model', () => {
    const model = buildPricingCatalogProjectionFromCreated(createdPayload(), baseContext());
    assert.equal(model.priceListId, 'pricelist-001');
    assert.equal(model.tenantId, 'tenant-001');
    assert.equal(model.branchId, 'branch-001');
    assert.equal(model.priceCount, 42);
    assert.equal(model.couponCount, 3);
    assert.equal(model.projectionVersion, PRICING_CATALOG_READ_PROJECTION_VERSION);
  });

  it('applyPricingCatalogProjectionUpdated merges counts and version', () => {
    const current = buildPricingCatalogProjectionFromCreated(createdPayload(), baseContext());
    const updated = applyPricingCatalogProjectionUpdated(
      current,
      {
        priceListId: 'pricelist-001',
        tenantId: 'tenant-001',
        pricingVersion: '1.1.0',
        priceCount: 50,
      },
      {
        ...baseContext(),
        eventType: PRICING_CATALOG_EVENT_TYPES.UPDATED,
      }
    );
    assert.equal(updated.pricingVersion, '1.1.0');
    assert.equal(updated.priceCount, 50);
    assert.equal(updated.couponCount, 3);
  });

  it('applyPricingCatalogProjectionDeleted marks catalog deleted', () => {
    const current = buildPricingCatalogProjectionFromCreated(createdPayload(), baseContext());
    const deleted = applyPricingCatalogProjectionDeleted(
      current,
      {
        priceListId: 'pricelist-001',
        tenantId: 'tenant-001',
        status: 'DELETED',
      },
      {
        ...baseContext(),
        eventType: PRICING_CATALOG_EVENT_TYPES.DELETED,
      }
    );
    assert.equal(deleted.status, 'DELETED');
    assert.equal(deleted.priceCount, 42);
  });

  it('resolvePricingCatalogProjectionTransition maps event types', () => {
    assert.equal(
      resolvePricingCatalogProjectionTransition(PRICING_CATALOG_EVENT_TYPES.CREATED),
      'create'
    );
    assert.equal(
      resolvePricingCatalogProjectionTransition(PRICING_CATALOG_EVENT_TYPES.UPDATED),
      'update'
    );
    assert.equal(
      resolvePricingCatalogProjectionTransition(PRICING_CATALOG_EVENT_TYPES.DELETED),
      'delete'
    );
    assert.equal(resolvePricingCatalogProjectionTransition('pricing.item.created.v1'), 'unsupported');
  });

  it('validatePricingCatalogProjectionReadModel rejects negative counts', () => {
    const model = buildPricingCatalogProjectionFromCreated(
      { ...createdPayload(), priceCount: -1 },
      baseContext()
    );
    const errors = validatePricingCatalogProjectionReadModel(model);
    assert.ok(errors.some((error) => error.includes('priceCount')));
  });

  it('validatePricingCatalogProjectionEventType rejects unsupported events', () => {
    const errors = validatePricingCatalogProjectionEventType('pricing.item.created.v1');
    assert.ok(errors.length > 0);
  });

  it('assertNoForbiddenFieldsInPricingReadModel blocks price and discount fields', () => {
    const errors = assertNoForbiddenFieldsInPricingReadModel({
      priceListId: 'pricelist-001',
      price: 100,
    });
    assert.ok(errors.some((error) => error.includes('price')));
  });

  it('canApplyPricingCatalogUpdate and canApplyPricingCatalogDelete require existing model', () => {
    assert.equal(canApplyPricingCatalogUpdate(null), false);
    assert.equal(canApplyPricingCatalogDelete(null), false);
    const model = buildPricingCatalogProjectionFromCreated(createdPayload(), baseContext());
    assert.equal(canApplyPricingCatalogUpdate(model), true);
    assert.equal(canApplyPricingCatalogDelete(model), true);
  });
});
