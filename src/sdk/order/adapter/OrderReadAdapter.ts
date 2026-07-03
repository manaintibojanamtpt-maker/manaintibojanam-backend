/**
 * Order read adapter — routes reads between legacy and projection repositories (M6 PR-11).
 * NOT a production switch. Default path remains legacy.
 */

import type { OrderId } from '../../core/types';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type {
  OrderAccessContext,
  OrderListFilter,
  OrderReadModel,
  OrderTenantListFilter,
} from '../../orders/types';
import type {
  LegacyOrderRepositoryPort,
  ProjectionOrderRepositoryPort,
  OrderAdapterReadinessPort,
  OrderReadAdapterPort,
} from './orderAdapterPorts';
import {
  readOrderAdapterFlagDefault,
  type OrderAdapterFeatureFlagReader,
} from './orderAdapterFeatureFlags';
import { decideOrderReadSource, shouldFallbackOnProjectionFailure } from '../../../domain/order/adapter/OrderAdapterRules';
import { ORDER_ADAPTER_FALLBACK_REASONS } from '../../../domain/order/adapter/OrderAdapterMetadata';
import type { OrderAdapterDecision } from '../../../domain/order/adapter/OrderAdapterDecision';
import { createLegacyOrderAdapter, type LegacyOrderAdapter } from './LegacyOrderAdapter';
import { createProjectionOrderAdapter, type ProjectionOrderAdapter } from './ProjectionOrderAdapter';
import { createOrderAdapterValidation, type OrderAdapterValidation } from './OrderAdapterValidation';
import type { OrderAdapterTelemetryHook } from './OrderAdapterTelemetry';
import { createOrderAdapterTelemetryEmitter } from './OrderAdapterTelemetry';

export interface OrderReadAdapterOptions {
  readonly featureFlags?: OrderAdapterFeatureFlagReader;
  readonly legacyRepository: LegacyOrderRepositoryPort;
  readonly projectionRepository: ProjectionOrderRepositoryPort;
  readonly readiness?: OrderAdapterReadinessPort;
  readonly legacyAdapter?: LegacyOrderAdapter;
  readonly projectionAdapter?: ProjectionOrderAdapter;
  readonly validator?: OrderAdapterValidation;
  readonly onTelemetry?: OrderAdapterTelemetryHook;
}

export class OrderReadAdapter implements OrderReadAdapterPort {
  private readonly legacyAdapter: LegacyOrderAdapter;
  private readonly projectionAdapter: ProjectionOrderAdapter;
  private readonly validator: OrderAdapterValidation;
  private cachedDecision: OrderAdapterDecision | null = null;

  constructor(private readonly options: OrderReadAdapterOptions) {
    this.legacyAdapter =
      options.legacyAdapter ?? createLegacyOrderAdapter(options.legacyRepository);
    this.projectionAdapter =
      options.projectionAdapter ?? createProjectionOrderAdapter(options.projectionRepository);
    this.validator = options.validator ?? createOrderAdapterValidation();
  }

  async resolveDecision(): SdkAsyncResult<OrderAdapterDecision> {
    const readFlag = this.options.featureFlags ?? readOrderAdapterFlagDefault;

    const parityResult = this.options.readiness
      ? await this.options.readiness.isParityReady()
      : { ok: true as const, value: false };
    const parityReady = parityResult.ok && parityResult.value === true;

    const operationalResult = this.options.readiness
      ? await this.options.readiness.isOperationalGreen()
      : { ok: true as const, value: false };
    const operationalGreen = operationalResult.ok && operationalResult.value === true;

    const availability = await this.options.projectionRepository.isAvailable();
    const projectionRepositoryAvailable = availability.ok && availability.value === true;

    const decision = decideOrderReadSource({
      adapterFlagEnabled: readFlag('FF_ORDER_PROJECTION_ADAPTER_ENABLED'),
      parityReady,
      operationalGreen,
      projectionRepositoryAvailable,
    });

    this.cachedDecision = decision;
    return sdkOk(decision);
  }

  private async getDecision(method: string, orderId?: string): Promise<OrderAdapterDecision> {
    if (this.cachedDecision) return this.cachedDecision;
    const resolved = await this.resolveDecision();
    if (!resolved.ok) {
      const telemetry = createOrderAdapterTelemetryEmitter(
        this.options.onTelemetry,
        method,
        orderId
      );
      telemetry.adapterFailed(resolved.error.code);
      return {
        source: 'legacy',
        reason: ORDER_ADAPTER_FALLBACK_REASONS.PROJECTION_READ_FAILED,
        fallback: true,
      };
    }
    return resolved.value;
  }

  async getOrderById(
    orderId: OrderId,
    context?: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel> {
    const telemetry = createOrderAdapterTelemetryEmitter(
      this.options.onTelemetry,
      'getOrderById',
      orderId
    );
    telemetry.adapterStarted();

    const validated = this.validator.validateOrderId(orderId);
    if (!validated.ok) {
      telemetry.adapterFailed(validated.error.code);
      return validated;
    }

    const decision = await this.getDecision('getOrderById', orderId);
    if (decision.source === 'projection') {
      telemetry.projectionSelected();
      const projected = await this.projectionAdapter.getOrderById(orderId, context);
      if (projected.ok) {
        telemetry.adapterCompleted('projection');
        return projected;
      }
      if (shouldFallbackOnProjectionFailure(decision)) {
        telemetry.adapterFallback(ORDER_ADAPTER_FALLBACK_REASONS.PROJECTION_READ_FAILED);
        const legacy = await this.legacyAdapter.getOrderById(orderId, context);
        telemetry.legacySelected(ORDER_ADAPTER_FALLBACK_REASONS.PROJECTION_READ_FAILED);
        telemetry.adapterCompleted('legacy');
        return legacy;
      }
      telemetry.adapterFailed(projected.error.code, 'projection');
      return projected;
    }

    telemetry.legacySelected(decision.reason);
    const legacy = await this.legacyAdapter.getOrderById(orderId, context);
    telemetry.adapterCompleted('legacy');
    return legacy;
  }

  async listOrdersForUser(
    filter: OrderListFilter,
    context: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel[]> {
    const telemetry = createOrderAdapterTelemetryEmitter(
      this.options.onTelemetry,
      'listOrdersForUser'
    );
    telemetry.adapterStarted();

    const validated = this.validator.validateUserListFilter(filter);
    if (!validated.ok) {
      telemetry.adapterFailed(validated.error.code);
      return validated;
    }

    const decision = await this.getDecision('listOrdersForUser');
    if (decision.source === 'projection') {
      telemetry.projectionSelected();
      const projected = await this.projectionAdapter.listOrdersForUser(filter, context);
      if (projected.ok) {
        telemetry.adapterCompleted('projection');
        return projected;
      }
      telemetry.adapterFallback(ORDER_ADAPTER_FALLBACK_REASONS.PROJECTION_READ_FAILED);
      const legacy = await this.legacyAdapter.listOrdersForUser(filter, context);
      telemetry.legacySelected(ORDER_ADAPTER_FALLBACK_REASONS.PROJECTION_READ_FAILED);
      telemetry.adapterCompleted('legacy');
      return legacy;
    }

    telemetry.legacySelected(decision.reason);
    const legacy = await this.legacyAdapter.listOrdersForUser(filter, context);
    telemetry.adapterCompleted('legacy');
    return legacy;
  }

  async listOrdersForTenant(
    filter: OrderTenantListFilter,
    context: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel[]> {
    const telemetry = createOrderAdapterTelemetryEmitter(
      this.options.onTelemetry,
      'listOrdersForTenant'
    );
    telemetry.adapterStarted();

    const validated = this.validator.validateTenantListFilter(filter);
    if (!validated.ok) {
      telemetry.adapterFailed(validated.error.code);
      return validated;
    }

    const decision = await this.getDecision('listOrdersForTenant');
    if (decision.source === 'projection') {
      telemetry.projectionSelected();
      const projected = await this.projectionAdapter.listOrdersForTenant(filter, context);
      if (projected.ok) {
        telemetry.adapterCompleted('projection');
        return projected;
      }
      telemetry.adapterFallback(ORDER_ADAPTER_FALLBACK_REASONS.PROJECTION_READ_FAILED);
      const legacy = await this.legacyAdapter.listOrdersForTenant(filter, context);
      telemetry.legacySelected(ORDER_ADAPTER_FALLBACK_REASONS.PROJECTION_READ_FAILED);
      telemetry.adapterCompleted('legacy');
      return legacy;
    }

    telemetry.legacySelected(decision.reason);
    const legacy = await this.legacyAdapter.listOrdersForTenant(filter, context);
    telemetry.adapterCompleted('legacy');
    return legacy;
  }
}

export function createOrderReadAdapter(options: OrderReadAdapterOptions): OrderReadAdapter {
  return new OrderReadAdapter(options);
}
