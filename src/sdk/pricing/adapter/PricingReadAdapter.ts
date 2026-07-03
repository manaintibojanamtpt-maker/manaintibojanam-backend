/**
 * Pricing read adapter — routes reads between legacy and projection repositories (M8 PR-11).
 * NOT a production switch. NOT wired into createPricingSDK(). Default path remains legacy.
 */

import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { GetPriceQuery, PricingContext } from '../dto';
import type { PriceResult } from '../dto';
import type {
  LegacyPricingReadPort,
  ProjectionPricingReadPort,
  PricingAdapterReadinessPort,
  PricingReadAdapterPort,
} from './pricingAdapterPorts';
import {
  readPricingAdapterFlagDefault,
  type PricingAdapterFeatureFlagReader,
} from './pricingAdapterFeatureFlags';
import {
  decidePricingReadSource,
  shouldFallbackOnPricingProjectionFailure,
} from '../../../domain/pricing/adapter/PricingAdapterRules';
import { PRICING_ADAPTER_FALLBACK_REASONS } from '../../../domain/pricing/adapter/PricingAdapterMetadata';
import type { PricingAdapterDecision } from '../../../domain/pricing/adapter/PricingAdapterDecision';
import { createLegacyPricingAdapter, type LegacyPricingAdapter } from './LegacyPricingAdapter';
import {
  createProjectionPricingAdapter,
  type ProjectionPricingAdapter,
} from './ProjectionPricingAdapter';
import { createPricingAdapterValidation, type PricingAdapterValidation } from './PricingAdapterValidation';
import type { PricingAdapterTelemetryHook } from './PricingAdapterTelemetry';
import { createPricingAdapterTelemetryEmitter } from './PricingAdapterTelemetry';
import { resolvePricingPriceListId } from './mapProjectionToPricingDto';

export interface PricingReadAdapterOptions {
  readonly featureFlags?: PricingAdapterFeatureFlagReader;
  readonly legacyRepository: LegacyPricingReadPort;
  readonly projectionRepository: ProjectionPricingReadPort;
  readonly readiness?: PricingAdapterReadinessPort;
  readonly legacyAdapter?: LegacyPricingAdapter;
  readonly projectionAdapter?: ProjectionPricingAdapter;
  readonly validator?: PricingAdapterValidation;
  readonly onTelemetry?: PricingAdapterTelemetryHook;
}

export class PricingReadAdapter implements PricingReadAdapterPort {
  private readonly legacyAdapter: LegacyPricingAdapter;
  private readonly projectionAdapter: ProjectionPricingAdapter;
  private readonly validator: PricingAdapterValidation;
  private cachedDecision: PricingAdapterDecision | null = null;

  constructor(private readonly options: PricingReadAdapterOptions) {
    this.legacyAdapter =
      options.legacyAdapter ?? createLegacyPricingAdapter(options.legacyRepository);
    this.projectionAdapter =
      options.projectionAdapter ?? createProjectionPricingAdapter(options.projectionRepository);
    this.validator = options.validator ?? createPricingAdapterValidation();
  }

  async resolveDecision(): SdkAsyncResult<PricingAdapterDecision> {
    const readFlag = this.options.featureFlags ?? readPricingAdapterFlagDefault;

    const projectionReadyResult = this.options.readiness
      ? await this.options.readiness.isProjectionReady()
      : { ok: true as const, value: false };
    const projectionReady = projectionReadyResult.ok && projectionReadyResult.value === true;

    const operationalResult = this.options.readiness
      ? await this.options.readiness.isOperationalGreen()
      : { ok: true as const, value: false };
    const operationalGreen = operationalResult.ok && operationalResult.value === true;

    const health = await this.options.projectionRepository.isHealthy();
    const projectionRepositoryHealthy = health.ok && health.value === true;

    const decision = decidePricingReadSource({
      adapterFlagEnabled: readFlag('FF_PRICING_PROJECTION_ADAPTER_ENABLED'),
      projectionReady,
      operationalGreen,
      projectionRepositoryHealthy,
    });

    this.cachedDecision = decision;
    return sdkOk(decision);
  }

  private async getDecision(method: string, priceListId?: string): Promise<PricingAdapterDecision> {
    if (this.cachedDecision) return this.cachedDecision;
    const resolved = await this.resolveDecision();
    if (!resolved.ok) {
      const telemetry = createPricingAdapterTelemetryEmitter(
        this.options.onTelemetry,
        method,
        priceListId
      );
      telemetry.adapterFailed(resolved.error.code);
      return {
        source: 'legacy',
        reason: PRICING_ADAPTER_FALLBACK_REASONS.PROJECTION_READ_FAILED,
        fallback: true,
      };
    }
    return resolved.value;
  }

  private async routeRead<T>(
    method: string,
    priceListId: string | undefined,
    legacyRead: () => SdkAsyncResult<T>,
    projectionRead: () => SdkAsyncResult<T>
  ): SdkAsyncResult<T> {
    const telemetry = createPricingAdapterTelemetryEmitter(
      this.options.onTelemetry,
      method,
      priceListId
    );
    telemetry.adapterStarted();

    try {
      const decision = await this.getDecision(method, priceListId);
      if (decision.source === 'projection') {
        telemetry.projectionSelected();
        const projected = await projectionRead();
        if (projected.ok) {
          telemetry.adapterCompleted('projection');
          return projected;
        }
        if (shouldFallbackOnPricingProjectionFailure(decision)) {
          const reason =
            projected.error.code === 'NOT_FOUND'
              ? PRICING_ADAPTER_FALLBACK_REASONS.PROJECTION_NOT_FOUND
              : projected.error.code === 'MAPPER_FAILED'
                ? PRICING_ADAPTER_FALLBACK_REASONS.PROJECTION_MAPPER_FAILED
                : projected.error.code === 'TIMEOUT'
                  ? PRICING_ADAPTER_FALLBACK_REASONS.PROJECTION_TIMEOUT
                  : PRICING_ADAPTER_FALLBACK_REASONS.PROJECTION_READ_FAILED;
          telemetry.adapterFallback(reason);
          const legacy = await legacyRead();
          telemetry.legacySelected(reason);
          telemetry.adapterCompleted('legacy');
          return legacy;
        }
        telemetry.adapterFailed(projected.error.code, 'projection');
        return projected;
      }

      telemetry.legacySelected(decision.reason);
      const legacy = await legacyRead();
      telemetry.adapterCompleted('legacy');
      return legacy;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN';
      telemetry.adapterFailed(message);
      const legacy = await legacyRead();
      telemetry.adapterCompleted('legacy');
      return legacy;
    }
  }

  async getPriceList(query: PricingContext): SdkAsyncResult<PriceResult> {
    const validated = this.validator.validatePricingContext(query);
    if (!validated.ok) {
      const telemetry = createPricingAdapterTelemetryEmitter(
        this.options.onTelemetry,
        'getPriceList',
        resolvePricingPriceListId(query.tenantId, query.branchId, query.priceListId)
      );
      telemetry.adapterStarted();
      telemetry.adapterFailed(validated.error.code);
      return validated;
    }

    const priceListId = resolvePricingPriceListId(
      query.tenantId,
      query.branchId,
      query.priceListId
    );
    return this.routeRead(
      'getPriceList',
      priceListId,
      () => this.legacyAdapter.getPriceList(query),
      () => this.projectionAdapter.getPriceList(query)
    );
  }

  async getPrice(query: GetPriceQuery): SdkAsyncResult<PriceResult> {
    const validated = this.validator.validateGetPriceQuery(query);
    if (!validated.ok) {
      const telemetry = createPricingAdapterTelemetryEmitter(
        this.options.onTelemetry,
        'getPrice',
        resolvePricingPriceListId(query.tenantId, query.branchId, query.priceListId)
      );
      telemetry.adapterStarted();
      telemetry.adapterFailed(validated.error.code);
      return validated;
    }

    const priceListId = resolvePricingPriceListId(
      query.tenantId,
      query.branchId,
      query.priceListId
    );
    return this.routeRead(
      'getPrice',
      priceListId,
      () => this.legacyAdapter.getPrice(query),
      () => this.projectionAdapter.getPrice(query)
    );
  }

  async listPriceListEntries(query: PricingContext): SdkAsyncResult<PriceResult[]> {
    const validated = this.validator.validatePricingContext(query);
    if (!validated.ok) {
      const telemetry = createPricingAdapterTelemetryEmitter(
        this.options.onTelemetry,
        'listPriceListEntries',
        resolvePricingPriceListId(query.tenantId, query.branchId, query.priceListId)
      );
      telemetry.adapterStarted();
      telemetry.adapterFailed(validated.error.code);
      return validated;
    }

    const priceListId = resolvePricingPriceListId(
      query.tenantId,
      query.branchId,
      query.priceListId
    );
    return this.routeRead(
      'listPriceListEntries',
      priceListId,
      () => this.legacyAdapter.listPriceListEntries(query),
      () => this.projectionAdapter.listPriceListEntries(query)
    );
  }
}

export function createPricingReadAdapter(options: PricingReadAdapterOptions): PricingReadAdapter {
  return new PricingReadAdapter(options);
}
