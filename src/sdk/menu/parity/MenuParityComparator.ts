/**
 * Menu parity comparator (M7 PR-8).
 * Loads legacy and projection views, normalizes, and compares without mutation.
 */

import type {
  LegacyMenuReadPort,
  ProjectionMenuReadPort,
  MenuParityComparatorPort,
} from './menuParityPorts';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import {
  readMenuFlagDefault,
  type MenuFeatureFlagReader,
} from '../featureFlags/featureFlags';
import { menuNotConfiguredAsync } from '../adapters/notConfigured';
import { compareMenuCanonicalModels } from '../../../domain/menu/parity/MenuParityRules';
import type { MenuParityResult } from '../../../domain/menu/parity/MenuParityResult';
import { createMenuParityMapper, type MenuParityMapper } from './MenuParityMapper';
import type { MenuParityTelemetryHook } from './MenuParityTelemetry';
import { createMenuParityTelemetryEmitter } from './MenuParityTelemetry';

export interface MenuParityClock {
  now(): string;
}

export interface MenuParityComparatorOptions {
  readonly featureFlags?: MenuFeatureFlagReader;
  readonly legacyReadPort: LegacyMenuReadPort;
  readonly projectionReadPort: ProjectionMenuReadPort;
  readonly mapper?: MenuParityMapper;
  readonly clock: MenuParityClock;
  readonly onTelemetry?: MenuParityTelemetryHook;
}

export class MenuParityComparator implements MenuParityComparatorPort {
  private readonly mapper: MenuParityMapper;

  constructor(private readonly options: MenuParityComparatorOptions) {
    this.mapper = options.mapper ?? createMenuParityMapper();
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readMenuFlagDefault;
    return readFlag('FF_MENU_PROJECTION_ENABLED') && readFlag('FF_MENU_PROJECTION_PARITY_ENABLED');
  }

  async compare(catalogId: string): SdkAsyncResult<MenuParityResult> {
    if (!this.isEnabled()) {
      return menuNotConfiguredAsync('compare', 'MenuParityComparator');
    }

    const telemetry = createMenuParityTelemetryEmitter(
      this.options.onTelemetry,
      'compare',
      catalogId
    );
    telemetry.parityStarted();

    try {
      const legacyResult = await this.options.legacyReadPort.get(catalogId);
      if (!legacyResult.ok) {
        telemetry.parityFailed(legacyResult.error.code);
        return legacyResult;
      }

      const projectionResult = await this.options.projectionReadPort.get(catalogId);
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
      const result = compareMenuCanonicalModels(
        catalogId,
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

export function createMenuParityComparator(
  options: MenuParityComparatorOptions
): MenuParityComparator {
  return new MenuParityComparator(options);
}
