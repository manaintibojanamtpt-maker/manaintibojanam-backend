import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createOrderParityInfrastructure,
  InMemoryLegacyOrderReadPort,
  InMemoryProjectionOrderReadPort,
} from '../events/parity/order/OrderParityFactory';
import { createOrderProjectionWorkerBundle } from '../events/projections/order/createOrderProjectionWorker';
import { createOrderEventFactory } from '../events/business/orders/OrderEventFactory';
import { createOrderParityMapper } from '../events/parity/order/OrderParityMapper';
import type { EventFeatureFlagReader } from '../events/core/featureFlags';
import type { OrderParityTelemetryEvent } from '../events/parity/order/OrderParityTelemetry';
import { EVENT_SDK_VERSION } from '../events/version';
import { EVENT_SDK_FEATURE_FLAG_DEFAULTS } from '../events/core/featureFlags';
import { ORDER_PAYLOAD_VERSION } from '../../domain/events/orders/OrderEventSchema';

const ORDER_PARITY_FLAGS: EventFeatureFlagReader = (flag) =>
  flag === 'FF_EVENT_PLATFORM_ENABLED' ||
  flag === 'FF_EVENT_PROJECTION_ENABLED' ||
  flag === 'FF_EVENT_PROJECTION_RUNTIME_ENABLED' ||
  flag === 'FF_ORDER_READ_PROJECTION_ENABLED' ||
  flag === 'FF_ORDER_PROJECTION_PARITY_ENABLED';

const FIXED_CLOCK = { now: () => '2026-06-26T22:00:00.000Z' };
const FIXED_UUID = {
  generate: (() => {
    let n = 0;
    return () => `parity-${++n}`;
  })(),
};

const legacyOrder = () => ({
  id: 'order-parity-001',
  tenantId: 'tenant-parity-001',
  userId: 'user-parity-001',
  status: 'PLACED',
  totalAmount: 600,
  subtotal: 600,
  paymentMethod: 'cod',
  paymentStatus: 'pending',
  items: [],
  createdAt: '2026-06-26T22:00:00.000Z',
  updatedAt: '2026-06-26T22:00:00.000Z',
});

const publishContext = () => ({
  correlationId: 'corr-parity-001',
  idempotencyKey: 'idem-parity-001',
});

describe('EventSDK order projection parity (M6 PR-8)', () => {
  it('exports EVENT_SDK_VERSION 1.0.0', () => {
    assert.equal(EVENT_SDK_VERSION, '1.0.0');
  });

  it('defaults FF_ORDER_PROJECTION_PARITY_ENABLED to off', () => {
    assert.equal(EVENT_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_ORDER_PROJECTION_PARITY_ENABLED, false);
  });

  it('OrderParityComparator skips when flags off', async () => {
    const legacyPort = new InMemoryLegacyOrderReadPort();
    legacyPort.seed(legacyOrder());
    const projectionPort = new InMemoryProjectionOrderReadPort();

    const infra = createOrderParityInfrastructure({
      legacyReadPort: legacyPort,
      projectionReadPort: projectionPort,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('order-parity-001');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('requires all five flags including FF_ORDER_PROJECTION_PARITY_ENABLED', async () => {
    const fourFlagsOnly: EventFeatureFlagReader = (flag) =>
      flag !== 'FF_ORDER_PROJECTION_PARITY_ENABLED' && ORDER_PARITY_FLAGS(flag);

    const legacyPort = new InMemoryLegacyOrderReadPort();
    legacyPort.seed(legacyOrder());

    const infra = createOrderParityInfrastructure({
      featureFlags: fourFlagsOnly,
      legacyReadPort: legacyPort,
      projectionReadPort: new InMemoryProjectionOrderReadPort(),
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('order-parity-001');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('OrderParityMapper normalizes legacy and projection views', () => {
    const mapper = createOrderParityMapper();
    const legacy = mapper.mapLegacy(legacyOrder());
    assert.equal(legacy.orderId, 'order-parity-001');
    assert.equal(legacy.status, 'PENDING');
    assert.equal(legacy.version, ORDER_PAYLOAD_VERSION);
    assert.equal(legacy.currency, 'INR');

    const projection = mapper.mapProjection({
      orderId: 'order-parity-001',
      tenantId: 'tenant-parity-001',
      status: 'PLACED',
      customerId: 'user-parity-001',
      totalAmount: 600,
      currency: 'INR',
      createdAt: '2026-06-26T22:00:00.000Z',
      updatedAt: '2026-06-26T22:00:00.000Z',
      version: '1.0.0',
      projectionVersion: '1.0.0',
    });
    assert.equal(projection.status, 'PENDING');
    assert.equal(projection.lineItems.length, 0);
  });

  it('returns MISSING_IN_PROJECTION when projection absent', async () => {
    const legacyPort = new InMemoryLegacyOrderReadPort();
    legacyPort.seed(legacyOrder());

    const infra = createOrderParityInfrastructure({
      featureFlags: ORDER_PARITY_FLAGS,
      legacyReadPort: legacyPort,
      projectionReadPort: new InMemoryProjectionOrderReadPort(),
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('order-parity-001');
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.outcome, 'MISSING_IN_PROJECTION');
  });

  it('returns FIELD_MISMATCH when status differs', async () => {
    const legacyPort = new InMemoryLegacyOrderReadPort();
    legacyPort.seed(legacyOrder());

    const projectionPort = new InMemoryProjectionOrderReadPort();
    projectionPort.seed({
      orderId: 'order-parity-001',
      tenantId: 'tenant-parity-001',
      status: 'CANCELLED',
      customerId: 'user-parity-001',
      totalAmount: 600,
      currency: 'INR',
      createdAt: '2026-06-26T22:00:00.000Z',
      updatedAt: '2026-06-26T22:00:00.000Z',
      version: '1.0.0',
      projectionVersion: '1.0.0',
    });

    const infra = createOrderParityInfrastructure({
      featureFlags: ORDER_PARITY_FLAGS,
      legacyReadPort: legacyPort,
      projectionReadPort: projectionPort,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('order-parity-001');
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.outcome, 'FIELD_MISMATCH');
  });

  it('returns MATCH when legacy and projection align', async () => {
    const legacyPort = new InMemoryLegacyOrderReadPort();
    legacyPort.seed(legacyOrder());

    const projectionBundle = createOrderProjectionWorkerBundle({
      featureFlags: ORDER_PARITY_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const factory = createOrderEventFactory({ clock: FIXED_CLOCK, uuid: FIXED_UUID });
    const created = factory.createOrderCreatedEvent(legacyOrder(), publishContext());
    assert.equal(created.ok, true);
    if (!created.ok) return;
    await projectionBundle.worker.process(created.value);

    const projectionPort = new InMemoryProjectionOrderReadPort();
    const stored = await projectionBundle.repository.get('order-parity-001');
    assert.equal(stored.ok, true);
    if (stored.ok && stored.value) projectionPort.seed(stored.value);

    const infra = createOrderParityInfrastructure({
      featureFlags: ORDER_PARITY_FLAGS,
      legacyReadPort: legacyPort,
      projectionReadPort: projectionPort,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('order-parity-001');
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.outcome, 'MATCH');
  });

  it('compareAndReport persists report and updates statistics', async () => {
    const telemetry: OrderParityTelemetryEvent[] = [];
    const legacyPort = new InMemoryLegacyOrderReadPort();
    legacyPort.seed(legacyOrder());

    const projectionPort = new InMemoryProjectionOrderReadPort();
    projectionPort.seed({
      orderId: 'order-parity-001',
      tenantId: 'tenant-parity-001',
      status: 'PLACED',
      customerId: 'user-parity-001',
      totalAmount: 600,
      currency: 'INR',
      createdAt: '2026-06-26T22:00:00.000Z',
      updatedAt: '2026-06-26T22:00:00.000Z',
      version: '1.0.0',
      projectionVersion: '1.0.0',
    });

    const infra = createOrderParityInfrastructure({
      featureFlags: ORDER_PARITY_FLAGS,
      legacyReadPort: legacyPort,
      projectionReadPort: projectionPort,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (e) => telemetry.push(e),
    });

    const report = await infra.compareAndReport('order-parity-001');
    assert.equal(report.ok, true);
    if (report.ok) {
      assert.equal(report.value.outcome, 'MATCH');
      assert.ok(report.value.reportId);
    }

    const stats = await infra.statistics();
    assert.equal(stats.ok, true);
    if (stats.ok) {
      assert.equal(stats.value.totalCompared, 1);
      assert.equal(stats.value.matched, 1);
    }

    assert.ok(telemetry.some((e) => e.type === 'order_parity_started'));
    assert.ok(telemetry.some((e) => e.type === 'order_parity_match'));
    assert.ok(telemetry.some((e) => e.type === 'order_parity_completed'));
  });

  it('detects line item FIELD_MISMATCH when legacy has items', async () => {
    const legacyPort = new InMemoryLegacyOrderReadPort();
    legacyPort.seed({
      ...legacyOrder(),
      items: [{ menuItemId: 'item-1', name: 'Thali', quantity: 1, lineTotal: 600 }],
    });

    const projectionPort = new InMemoryProjectionOrderReadPort();
    projectionPort.seed({
      orderId: 'order-parity-001',
      tenantId: 'tenant-parity-001',
      status: 'PLACED',
      customerId: 'user-parity-001',
      totalAmount: 600,
      currency: 'INR',
      createdAt: '2026-06-26T22:00:00.000Z',
      updatedAt: '2026-06-26T22:00:00.000Z',
      version: '1.0.0',
      projectionVersion: '1.0.0',
    });

    const infra = createOrderParityInfrastructure({
      featureFlags: ORDER_PARITY_FLAGS,
      legacyReadPort: legacyPort,
      projectionReadPort: projectionPort,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('order-parity-001');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.outcome, 'FIELD_MISMATCH');
      assert.ok(result.value.differences.some((d) => d.field === 'lineItems.length'));
    }
  });

  it('validate rejects empty orderId', async () => {
    const infra = createOrderParityInfrastructure({
      featureFlags: ORDER_PARITY_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });
    const result = await infra.validate('');
    assert.equal(result.ok, false);
  });
});
