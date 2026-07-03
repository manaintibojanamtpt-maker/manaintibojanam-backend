/**
 * Pricing parity comparator (M8 PR-8).
 * Loads legacy and projection views, normalizes, and compares without mutation.
 */

import type {
  LegacyPricingReadPort,
  ProjectionPricingReadPort,
  PricingParityComparatorPort,
} from './pricingParityPorts';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import {
  readPricingFlagDefault,
  type PricingFeatureFlagReader,
} from '../featureFlags/featureFlags';
import { pricingNotConfiguredAsync } from '../adapters/notConfigured';
import { comparePricingCanonicalModels } from '../../../domain/pricing/parity/PricingParityRules';
import type { PricingParityResult } from '../../../domain/pricing/parity/PricingParityResult';
import { createPricingParityMapper, type PricingParityMapper } from './PricingParityMapper';
import type { PricingParityTelemetryHook } from './PricingParityTelemetry';
import { createPricingParityTelemetryEmitter } from './PricingParityTelemetry';

export interface PricingParityClock {
  now(): string;
}

export interface PricingParityComparatorOptions {
  readonly featureFlags?: PricingFeatureFlagReader;
  readonly legacyReadPort: LegacyPricingReadPort;
  readonly projectionReadPort: ProjectionPricingReadPort;
  readonly mapper?: PricingParityMapper;
  readonly clock: PricingParityClock;
  readonly onTelemetry?: PricingParityTelemetryHook;
}

export class PricingParityComparator implements PricingParityComparatorPort {
  private readonly mapper: PricingParityMapper;

  constructor(private readonly options: PricingParityComparatorOptions) {
    this.mapper = options.mapper ?? createPricingParityMapper();
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readPricingFlagDefault;
    return (
      readFlag('FF_PRICING_PROJECTION_ENABLED') &&
      readFlag('FF_PRICING_PROJECTION_PARITY_ENABLED')
    );
  }

  async compare(priceListId: string): SdkAsyncResult<PricingParityResult> {
    if (!this.isEnabled()) {
      return pricingNotConfiguredAsync('compare', 'PricingParityComparator');
    }

    const telemetry = createPricingParityTelemetryEmitter(
      this.options.onTelemetry,
      'compare',
      priceListId
    );
    telemetry.parityStarted();

    try {
      const legacyResult = await this.options.legacyReadPort.get(priceListId);
      if (!legacyResult.ok) {
        telemetry.parityFailed(legacyResult.error.code);
        return legacyResult;
      }

      const projectionResult = await this.options.projectionReadPort.get(priceListId);
      if (!projectionResult.ok) {
        telemetry.parityFailed(projectionResult.error.code);
        return projectionResult;
      }

      const legacyCanonical =
        legacyResult.value === null ? null : this.mapper.mapLegacy(legacyResult.value);
      const projectionCanonical =
        projectionResult.value === null
          ? null
          : this.mapper.mapProjection(projectionResult.value);

      const comparedAt = this.options.clock.now();
      const result = comparePricingCanonicalModels(
        priceListId,
        legacyCanonical,
        projectionCanonical,
        comparedAt
      );

      if (result.outcome === 'MATCH') {
        telemetry.parityMatch(result.outcome);
      } else {
        telemetry.parityMismatch(result.outcome);
      }
      telemetry.parityCompleted(result.outcome);

      return sdkOk(result);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'UNKNOWN';
      telemetry.parityFailed(code);
      return {
        ok: false,
        error: { code: 'INTERNAL', message: code },
      };
    }
  }
}

export function createPricingParityComparator(
  options: PricingParityComparatorOptions
): PricingParityComparator {
  return new PricingParityComparator(options);
}
