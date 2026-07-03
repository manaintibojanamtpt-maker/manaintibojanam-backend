/**
 * Pricing parity infrastructure factory (M8 PR-8).
 * Validation only — no PricingSDK routing switch.
 */

import type {
  LegacyPricingReadPort,
  ProjectionPricingReadPort,
  PricingParityInfrastructurePort,
} from './pricingParityPorts';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { PricingFeatureFlagReader } from '../featureFlags/featureFlags';
import { createPricingParityValidator, type PricingParityValidator } from './PricingParityValidator';
import { createPricingParityComparator, type PricingParityComparator } from './PricingParityComparator';
import {
  createPricingParityReportRepository,
  buildPricingParityReportRecord,
  type PricingParityReportRepository,
} from './PricingParityReport';
import type { PricingParityTelemetryHook } from './PricingParityTelemetry';
import { createPricingParityTelemetryEmitter } from './PricingParityTelemetry';
import type { LegacyPricingCatalogDocument } from '../../../domain/pricing/parity/PricingCanonicalModel';
import type { PricingCatalogProjectionReadModel } from '../../../domain/pricing/projections/pricing/PricingProjectionState';
import { EMPTY_PRICING_PARITY_STATISTICS } from '../../../domain/pricing/parity/PricingParityStatistics';
import { summarizePricingParityStatistics } from '../../../domain/pricing/parity/PricingParityStatistics';

export interface PricingParityInfrastructure extends PricingParityInfrastructurePort {
  readonly validator: PricingParityValidator;
  readonly comparator: PricingParityComparator;
  readonly reportRepository: PricingParityReportRepository;
  readonly legacyReadPort: LegacyPricingReadPort;
  readonly projectionReadPort: ProjectionPricingReadPort;
}

export interface PricingParityClock {
  now(): string;
}

export interface PricingParityUuid {
  generate(): string;
}

export interface CreatePricingParityInfrastructureOptions {
  readonly featureFlags?: PricingFeatureFlagReader;
  readonly legacyReadPort?: LegacyPricingReadPort;
  readonly projectionReadPort?: ProjectionPricingReadPort;
  readonly reportRepository?: PricingParityReportRepository;
  readonly clock?: PricingParityClock;
  readonly uuid?: PricingParityUuid;
  readonly onTelemetry?: PricingParityTelemetryHook;
}

export class InMemoryLegacyPricingReadPort implements LegacyPricingReadPort {
  private readonly store = new Map<string, LegacyPricingCatalogDocument>();

  seed(document: LegacyPricingCatalogDocument): void {
    this.store.set(document.priceListId, document);
  }

  get(priceListId: string): SdkAsyncResult<LegacyPricingCatalogDocument | null> {
    return Promise.resolve(sdkOk(this.store.get(priceListId) ?? null));
  }
}

export class InMemoryProjectionPricingReadPort implements ProjectionPricingReadPort {
  private readonly store = new Map<string, PricingCatalogProjectionReadModel>();

  seed(model: PricingCatalogProjectionReadModel): void {
    this.store.set(model.priceListId, model);
  }

  get(priceListId: string): SdkAsyncResult<PricingCatalogProjectionReadModel | null> {
    return Promise.resolve(sdkOk(this.store.get(priceListId) ?? null));
  }
}

const defaultClock = (): PricingParityClock => ({
  now: () => new Date().toISOString(),
});

const defaultUuid = (): PricingParityUuid => {
  let counter = 0;
  return {
    generate: () => `pricing-parity-${++counter}`,
  };
};

export function createPricingParityInfrastructure(
  options: CreatePricingParityInfrastructureOptions = {}
): PricingParityInfrastructure {
  const clock = options.clock ?? defaultClock();
  const uuid = options.uuid ?? defaultUuid();
  const legacyReadPort = options.legacyReadPort ?? new InMemoryLegacyPricingReadPort();
  const projectionReadPort = options.projectionReadPort ?? new InMemoryProjectionPricingReadPort();
  const reportRepository = options.reportRepository ?? createPricingParityReportRepository();
  const validator = createPricingParityValidator();
  const comparator = createPricingParityComparator({
    featureFlags: options.featureFlags,
    legacyReadPort,
    projectionReadPort,
    clock,
    onTelemetry: options.onTelemetry,
  });

  return {
    validator,
    comparator,
    reportRepository,
    legacyReadPort,
    projectionReadPort,

    async validate(priceListId) {
      return Promise.resolve(validator.validatePriceListId(priceListId));
    },

    async compare(priceListId) {
      const validated = validator.validatePriceListId(priceListId);
      if (!validated.ok) return validated;
      return comparator.compare(priceListId);
    },

    async compareAndReport(priceListId) {
      const startedAt =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const telemetry = createPricingParityTelemetryEmitter(
        options.onTelemetry,
        'compareAndReport',
        priceListId
      );
      telemetry.parityStarted();

      const validated = validator.validatePriceListId(priceListId);
      if (!validated.ok) {
        telemetry.parityFailed(validated.error.code);
        return validated;
      }

      const compared = await comparator.compare(priceListId);
      if (!compared.ok) return compared;

      const durationMs = Math.max(
        0,
        Math.round(
          (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt
        )
      );

      const report = buildPricingParityReportRecord(
        uuid.generate(),
        compared.value,
        compared.value.priceListId,
        durationMs
      );
      await reportRepository.save(report);
      telemetry.parityCompleted(compared.value.outcome);
      return sdkOk(report);
    },

    async statistics() {
      const stats = reportRepository.getStatistics();
      return sdkOk(
        summarizePricingParityStatistics(
          stats.totalCompared > 0 ? stats : EMPTY_PRICING_PARITY_STATISTICS
        )
      );
    },
  };
}

export {
  createPricingParityValidator,
  createPricingParityComparator,
  createPricingParityReportRepository,
  buildPricingParityReportRecord,
};
export { createPricingParityMapper } from './PricingParityMapper';
