import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createOrderReadAdapterInfrastructure } from '../order/adapter/OrderAdapterFactory';
import { mapProjectionToOrderReadModel } from '../order/adapter/mapProjectionToOrderReadModel';
import type {
  LegacyOrderRepositoryPort,
  ProjectionOrderRepositoryPort,
  OrderAdapterReadinessPort,
} from '../order/adapter/orderAdapterPorts';
import type { OrderAdapterFeatureFlagReader } from '../order/adapter/orderAdapterFeatureFlags';
import { ORDER_ADAPTER_FEATURE_FLAG_DEFAULTS } from '../order/adapter/orderAdapterFeatureFlags';
import type { OrderAdapterTelemetryEvent } from '../order/adapter/OrderAdapterTelemetry';
import type { OrderReadModel } from '../orders/types';
import type { OrderProjectionReadModel } from '../../domain/events/projections/order/OrderProjectionState';
import type { OrderId, UserId } from '../core/types';
import { sdkOk } from '../core/resultHelpers';

const ADAPTER_ON: OrderAdapterFeatureFlagReader = () => true;
const ADAPTER_OFF: OrderAdapterFeatureFlagReader = () => false;

const legacyOrder = (): OrderReadModel => ({
  id: 'order-adapter-001' as OrderId,
  tenantId: 'tenant-001' as import('../core/types').TenantId,
  userId: 'user-001' as UserId,
  status: 'PLACED',
  paymentMethod: 'cod',
  paymentStatus: 'pending',
  items: [
    {
      menuItemId: 'item-1',
      name: 'Thali',
      unitPrice: 100,
      quantity: 1,
      lineSubtotal: 100,
      lineTotal: 100,
    },
  ],
  subtotal: 100,
  totalAmount: 100,
  createdAt: '2026-06-27T10:00:00.000Z' as import('../core/types').IsoDateTime,
});

const projectionOrder = (): OrderProjectionReadModel => ({
  orderId: 'order-adapter-001',
  tenantId: 'tenant-001',
  status: 'PLACED',
  customerId: 'user-001',
  totalAmount: 100,
  currency: 'INR',
  createdAt: '2026-06-27T10:00:00.000Z',
  updatedAt: '2026-06-27T10:00:00.000Z',
  version: '1.0.0',
  projectionVersion: '1.0.0',
});

const createLegacyRepo = (overrides: Partial<LegacyOrderRepositoryPort> = {}): LegacyOrderRepositoryPort => ({
  getOrderById: async () => sdkOk(legacyOrder()),
  listOrdersForUser: async () => sdkOk([legacyOrder()]),
  listOrdersForTenant: async () => sdkOk([legacyOrder()]),
  ...overrides,
});

const createProjectionRepo = (
  overrides: Partial<ProjectionOrderRepositoryPort> = {}
): ProjectionOrderRepositoryPort => ({
  getOrderById: async () => sdkOk(projectionOrder()),
  listByTenant: async () => sdkOk([projectionOrder()]),
  isAvailable: async () => sdkOk(true),
  ...overrides,
});

const readinessReady = (): OrderAdapterReadinessPort => ({
  isParityReady: async () => sdkOk(true),
  isOperationalGreen: async () => sdkOk(true),
});

const readinessNotReady = (): OrderAdapterReadinessPort => ({
  isParityReady: async () => sdkOk(false),
  isOperationalGreen: async () => sdkOk(true),
});

describe('Order read adapter (M6 PR-11)', () => {
  it('defaults FF_ORDER_PROJECTION_ADAPTER_ENABLED to off', () => {
    assert.equal(
      ORDER_ADAPTER_FEATURE_FLAG_DEFAULTS.flags.FF_ORDER_PROJECTION_ADAPTER_ENABLED,
      false
    );
  });

  it('mapProjectionToOrderReadModel normalizes projection to OrderReadModel', () => {
    const model = mapProjectionToOrderReadModel(projectionOrder());
    assert.equal(model.id, 'order-adapter-001');
    assert.equal(model.userId, 'user-001');
    assert.equal(model.items.length, 0);
  });

  it('routes to legacy when adapter flag off', async () => {
    let legacyReads = 0;
    const infra = createOrderReadAdapterInfrastructure({
      featureFlags: ADAPTER_OFF,
      legacyRepository: createLegacyRepo({
        getOrderById: async () => {
          legacyReads += 1;
          return sdkOk(legacyOrder());
        },
      }),
      projectionRepository: createProjectionRepo(),
      readiness: readinessReady(),
    });

    const result = await infra.adapter.getOrderById('order-adapter-001' as OrderId);
    assert.equal(result.ok, true);
    assert.equal(legacyReads, 1);
    const decision = await infra.adapter.resolveDecision();
    assert.equal(decision.ok, true);
    if (decision.ok) assert.equal(decision.value.source, 'legacy');
  });

  it('routes to projection when flag on and gates pass', async () => {
    const telemetry: OrderAdapterTelemetryEvent[] = [];
    const infra = createOrderReadAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo(),
      projectionRepository: createProjectionRepo(),
      readiness: readinessReady(),
      onTelemetry: (e) => telemetry.push(e),
    });

    const result = await infra.adapter.getOrderById('order-adapter-001' as OrderId);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.id, 'order-adapter-001');

    const decision = await infra.adapter.resolveDecision();
    assert.equal(decision.ok, true);
    if (decision.ok) assert.equal(decision.value.source, 'projection');

    assert.ok(telemetry.some((e) => e.type === 'order_adapter_projection_selected'));
    assert.ok(telemetry.some((e) => e.type === 'order_adapter_completed'));
  });

  it('falls back to legacy when parity not ready', async () => {
    const telemetry: OrderAdapterTelemetryEvent[] = [];
    let legacyReads = 0;
    const infra = createOrderReadAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo({
        getOrderById: async () => {
          legacyReads += 1;
          return sdkOk(legacyOrder());
        },
      }),
      projectionRepository: createProjectionRepo(),
      readiness: readinessNotReady(),
      onTelemetry: (e) => telemetry.push(e),
    });

    const result = await infra.adapter.getOrderById('order-adapter-001' as OrderId);
    assert.equal(result.ok, true);
    assert.equal(legacyReads, 1);
    assert.ok(telemetry.some((e) => e.type === 'order_adapter_legacy_selected'));
  });

  it('falls back to legacy when projection read fails', async () => {
    const telemetry: OrderAdapterTelemetryEvent[] = [];
    let legacyReads = 0;
    const infra = createOrderReadAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo({
        getOrderById: async () => {
          legacyReads += 1;
          return sdkOk(legacyOrder());
        },
      }),
      projectionRepository: createProjectionRepo({
        getOrderById: async () => ({
          ok: false,
          error: { code: 'UNAVAILABLE', message: 'projection down' },
        }),
      }),
      readiness: readinessReady(),
      onTelemetry: (e) => telemetry.push(e),
    });

    const result = await infra.adapter.getOrderById('order-adapter-001' as OrderId);
    assert.equal(result.ok, true);
    assert.equal(legacyReads, 1);
    assert.ok(telemetry.some((e) => e.type === 'order_adapter_fallback'));
  });

  it('falls back when projection repository unavailable', async () => {
    const infra = createOrderReadAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo(),
      projectionRepository: createProjectionRepo({
        isAvailable: async () => sdkOk(false),
      }),
      readiness: readinessReady(),
    });

    const decision = await infra.adapter.resolveDecision();
    assert.equal(decision.ok, true);
    if (decision.ok) {
      assert.equal(decision.value.source, 'legacy');
      assert.equal(decision.value.fallback, true);
    }
  });

  it('listOrdersForUser validates userId', async () => {
    const infra = createOrderReadAdapterInfrastructure({
      featureFlags: ADAPTER_OFF,
      legacyRepository: createLegacyRepo(),
      projectionRepository: createProjectionRepo(),
    });

    const result = await infra.adapter.listOrdersForUser({}, {});
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'VALIDATION_FAILED');
  });

  it('listOrdersForTenant uses projection when selected', async () => {
    const infra = createOrderReadAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo(),
      projectionRepository: createProjectionRepo(),
      readiness: readinessReady(),
    });

    const result = await infra.adapter.listOrdersForTenant(
      { tenantId: 'tenant-001' as import('../core/types').TenantId },
      {}
    );
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.length, 1);
  });
});
