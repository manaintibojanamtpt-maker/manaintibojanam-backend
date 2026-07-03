import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PRICING_SDK_FEATURE_FLAG_DEFAULTS,
  type PricingFeatureFlagReader,
} from '../pricing/featureFlags/featureFlags';
import { createPricingProjectionWorkerBundle } from '../pricing/projections/pricing/createPricingProjectionWorker';
import { PricingProjectionWorker } from '../pricing/projections/pricing/PricingProjectionWorker';
import { PRICING_CATALOG_EVENT_TYPES } from '../../domain/pricing/projections/pricing/PricingProjectionMetadata';
import type { PricingCatalogProjectionTelemetryEvent } from '../pricing/projections/pricing/PricingProjectionTelemetry';
import type {
  PricingCatalogCreatedPayload,
  PricingCatalogDeletedPayload,
  PricingCatalogUpdatedPayload,
} from '../../domain/pricing/projections/pricing/PricingProjectionMetadata';
import type { PricingProjectionEnvelope } from '../pricing/projections/pricing/pricingProjectionPorts';

const PROJECTION_FLAGS: PricingFeatureFlagReader = (flag) =>
  flag === 'FF_PRICING_PROJECTION_ENABLED';

const FIXED_CLOCK = { now: () => '2026-07-03T10:00:00.000Z' };
const FIXED_UUID = {
  generate: (() => {
    let n = 0;
    return () => `pricing-catalog-snap-${++n}`;
  })(),
};

const catalogPayload = (): PricingCatalogCreatedPayload => ({
  priceListId: 'pricelist-proj-001',
  tenantId: 'tenant-proj-001',
  pricingVersion: '1.0.0',
  status: 'ACTIVE',
  priceCount: 42,
  couponCount: 3,
  campaignCount: 2,
  offerCount: 1,
});

const envelope = <TPayload>(
  type: string,
  payload: TPayload,
  eventId = 'evt-pricing-001'
): PricingProjectionEnvelope<TPayload> => ({
  header: {
    eventId,
    type,
    version: '1.0.0',
    aggregateId: 'pricelist-proj-001',
    occurredAt: '2026-07-03T10:00:00.000Z',
  },
  metadata: {
    correlationId: 'corr-pricing-001',
    custom: { branchId: 'branch-proj-001' },
  },
  payload,
});

describe('Pricing catalog shadow projection (M8 PR-7)', () => {
  it('defaults FF_PRICING_PROJECTION_ENABLED to off', () => {
    assert.equal(PRICING_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_PRICING_PROJECTION_ENABLED, false);
  });

  it('PricingProjectionWorker skips when flag is off', async () => {
    const bundle = createPricingProjectionWorkerBundle({
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const result = await bundle.worker.process(
      envelope(PRICING_CATALOG_EVENT_TYPES.CREATED, catalogPayload())
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('processes pricing.catalog.created.v1 and persists read model', async () => {
    const telemetry: PricingCatalogProjectionTelemetryEvent[] = [];
    const bundle = createPricingProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (event) => telemetry.push(event),
    });

    const result = await bundle.worker.process(
      envelope(PRICING_CATALOG_EVENT_TYPES.CREATED, catalogPayload())
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.applied, true);
    assert.equal(result.value.eventType, PRICING_CATALOG_EVENT_TYPES.CREATED);
    assert.ok(result.value.readModel);
    assert.equal(result.value.readModel!.priceListId, 'pricelist-proj-001');
    assert.equal(result.value.readModel!.tenantId, 'tenant-proj-001');
    assert.equal(result.value.readModel!.branchId, 'branch-proj-001');
    assert.equal(result.value.readModel!.priceCount, 42);
    assert.equal(result.value.readModel!.projectionVersion, '1.0.0');

    const stored = await bundle.repository.get('pricelist-proj-001');
    assert.equal(stored.ok, true);
    if (!stored.ok) return;
    assert.equal(stored.value?.status, 'ACTIVE');
    assert.equal(stored.value?.priceCount, 42);

    const snapshot = await bundle.snapshotStore.loadLatest('pricelist-proj-001');
    assert.equal(snapshot.ok, true);
    if (!snapshot.ok) return;
    assert.ok(snapshot.value);
    assert.equal(snapshot.value!.priceCount, 42);
    assert.equal('readModel' in (snapshot.value as object), false);

    assert.ok(telemetry.some((event) => event.type === 'pricing_projection_started'));
    assert.ok(telemetry.some((event) => event.type === 'pricing_projection_processed'));
    assert.ok(telemetry.some((event) => event.type === 'pricing_projection_completed'));
    assert.ok(telemetry.some((event) => event.type === 'pricing_projection_snapshot_saved'));
  });

  it('processes pricing.catalog.updated.v1 after create', async () => {
    const bundle = createPricingProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    await bundle.worker.process(envelope(PRICING_CATALOG_EVENT_TYPES.CREATED, catalogPayload()));

    const updatedPayload: PricingCatalogUpdatedPayload = {
      priceListId: 'pricelist-proj-001',
      tenantId: 'tenant-proj-001',
      pricingVersion: '1.1.0',
      status: 'ACTIVE',
      priceCount: 50,
    };

    const result = await bundle.worker.process(
      envelope(PRICING_CATALOG_EVENT_TYPES.UPDATED, updatedPayload, 'evt-pricing-002')
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.applied, true);
    assert.equal(result.value.readModel!.pricingVersion, '1.1.0');
    assert.equal(result.value.readModel!.priceCount, 50);
    assert.equal(result.value.readModel!.couponCount, 3);
  });

  it('processes pricing.catalog.deleted.v1 after create', async () => {
    const bundle = createPricingProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    await bundle.worker.process(envelope(PRICING_CATALOG_EVENT_TYPES.CREATED, catalogPayload()));

    const deletedPayload: PricingCatalogDeletedPayload = {
      priceListId: 'pricelist-proj-001',
      tenantId: 'tenant-proj-001',
      status: 'DELETED',
    };

    const result = await bundle.worker.process(
      envelope(PRICING_CATALOG_EVENT_TYPES.DELETED, deletedPayload, 'evt-pricing-003')
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.applied, true);
    assert.equal(result.value.readModel!.status, 'DELETED');
  });

  it('returns applied false when update arrives without existing read model', async () => {
    const bundle = createPricingProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const updatedPayload: PricingCatalogUpdatedPayload = {
      priceListId: 'pricelist-proj-001',
      tenantId: 'tenant-proj-001',
      pricingVersion: '1.1.0',
    };

    const result = await bundle.worker.process(
      envelope(PRICING_CATALOG_EVENT_TYPES.UPDATED, updatedPayload)
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.applied, false);
    assert.match(result.value.reason ?? '', /without existing read model/i);
  });

  it('returns applied false when delete arrives without existing read model', async () => {
    const bundle = createPricingProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const deletedPayload: PricingCatalogDeletedPayload = {
      priceListId: 'pricelist-proj-001',
      tenantId: 'tenant-proj-001',
      status: 'DELETED',
    };

    const result = await bundle.worker.process(
      envelope(PRICING_CATALOG_EVENT_TYPES.DELETED, deletedPayload)
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.applied, false);
    assert.match(result.value.reason ?? '', /without existing read model/i);
  });

  it('rejects unsupported event types with validation failure', async () => {
    const bundle = createPricingProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await bundle.worker.process(
      envelope('pricing.item.created.v1', catalogPayload())
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'VALIDATION');
  });

  it('rejects envelope without correlationId', async () => {
    const bundle = createPricingProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const invalid = {
      ...envelope(PRICING_CATALOG_EVENT_TYPES.CREATED, catalogPayload()),
      metadata: {},
    };
    const result = await bundle.worker.process(invalid);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'VALIDATION');
  });

  it('listByTenant, count, and delete expose repository persistence', async () => {
    const bundle = createPricingProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    await bundle.worker.process(envelope(PRICING_CATALOG_EVENT_TYPES.CREATED, catalogPayload()));

    const listed = await bundle.repository.listByTenant('tenant-proj-001', 10);
    assert.equal(listed.ok, true);
    if (!listed.ok) return;
    assert.equal(listed.value.length, 1);

    const count = await bundle.repository.count();
    assert.equal(count.ok, true);
    if (!count.ok) return;
    assert.equal(count.value, 1);

    const deleted = await bundle.repository.delete('pricelist-proj-001');
    assert.equal(deleted.ok, true);
    const afterDelete = await bundle.repository.count();
    assert.equal(afterDelete.ok, true);
    if (!afterDelete.ok) return;
    assert.equal(afterDelete.value, 0);
  });

  it('read model excludes forbidden price and calculation fields', async () => {
    const bundle = createPricingProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await bundle.worker.process(
      envelope(PRICING_CATALOG_EVENT_TYPES.CREATED, catalogPayload())
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const record = result.value.readModel as unknown as Record<string, unknown>;
    assert.equal('price' in record, false);
    assert.equal('gst' in record, false);
    assert.equal('discount' in record, false);
    assert.equal('couponPayload' in record, false);
  });

  it('worker never throws on unexpected internal failure', async () => {
    const bundle = createPricingProjectionWorkerBundle({
      featureFlags: PROJECTION_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const brokenEnvelope = {
      header: {
        eventId: 'evt-broken',
        type: PRICING_CATALOG_EVENT_TYPES.CREATED,
        version: '1.0.0',
        aggregateId: 'pricelist-proj-001',
        occurredAt: '2026-07-03T10:00:00.000Z',
      },
      metadata: { correlationId: 'corr-broken' },
      payload: null,
    };

    const result = await bundle.worker.process(brokenEnvelope as PricingProjectionEnvelope);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(typeof result.value.applied, 'boolean');
  });

  it('PricingProjectionWorker exposes projection identity and supported events', () => {
    const identity = PricingProjectionWorker.projectionIdentity();
    assert.equal(identity.projectionName, 'pricing-catalog-read-shadow');
    assert.equal(identity.ownerPlatform, 'M8-PricingKernel');
    assert.ok(
      PricingProjectionWorker.supportedEventTypes().includes('pricing.catalog.created.v1')
    );
  });
});
