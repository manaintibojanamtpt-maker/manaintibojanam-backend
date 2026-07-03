/**
 * Menu parity infrastructure factory (M7 PR-8).
 * Validation only — no MenuSDK routing switch.
 */

import type {
  LegacyMenuReadPort,
  ProjectionMenuReadPort,
  MenuParityInfrastructurePort,
} from './menuParityPorts';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { MenuFeatureFlagReader } from '../featureFlags/featureFlags';
import { createMenuParityValidator, type MenuParityValidator } from './MenuParityValidator';
import { createMenuParityComparator, type MenuParityComparator } from './MenuParityComparator';
import {
  createMenuParityReportRepository,
  buildMenuParityReportRecord,
  type MenuParityReportRepository,
} from './MenuParityReport';
import type { MenuParityTelemetryHook } from './MenuParityTelemetry';
import { createMenuParityTelemetryEmitter } from './MenuParityTelemetry';
import type { LegacyMenuCatalogDocument } from '../../../domain/menu/parity/MenuCanonicalModel';
import type { MenuCatalogProjectionReadModel } from '../../../domain/menu/projections/menu/MenuProjectionState';
import { EMPTY_MENU_PARITY_STATISTICS } from '../../../domain/menu/parity/MenuParityStatistics';
import { summarizeMenuParityStatistics } from '../../../domain/menu/parity/MenuParityStatistics';

export interface MenuParityInfrastructure extends MenuParityInfrastructurePort {
  readonly validator: MenuParityValidator;
  readonly comparator: MenuParityComparator;
  readonly reportRepository: MenuParityReportRepository;
  readonly legacyReadPort: LegacyMenuReadPort;
  readonly projectionReadPort: ProjectionMenuReadPort;
}

export interface MenuParityClock {
  now(): string;
}

export interface MenuParityUuid {
  generate(): string;
}

export interface CreateMenuParityInfrastructureOptions {
  readonly featureFlags?: MenuFeatureFlagReader;
  readonly legacyReadPort?: LegacyMenuReadPort;
  readonly projectionReadPort?: ProjectionMenuReadPort;
  readonly reportRepository?: MenuParityReportRepository;
  readonly clock?: MenuParityClock;
  readonly uuid?: MenuParityUuid;
  readonly onTelemetry?: MenuParityTelemetryHook;
}

export class InMemoryLegacyMenuReadPort implements LegacyMenuReadPort {
  private readonly store = new Map<string, LegacyMenuCatalogDocument>();

  seed(document: LegacyMenuCatalogDocument): void {
    this.store.set(document.catalogId, document);
  }

  get(catalogId: string): SdkAsyncResult<LegacyMenuCatalogDocument | null> {
    return Promise.resolve(sdkOk(this.store.get(catalogId) ?? null));
  }
}

export class InMemoryProjectionMenuReadPort implements ProjectionMenuReadPort {
  private readonly store = new Map<string, MenuCatalogProjectionReadModel>();

  seed(model: MenuCatalogProjectionReadModel): void {
    this.store.set(model.catalogId, model);
  }

  get(catalogId: string): SdkAsyncResult<MenuCatalogProjectionReadModel | null> {
    return Promise.resolve(sdkOk(this.store.get(catalogId) ?? null));
  }
}

const defaultClock = (): MenuParityClock => ({
  now: () => new Date().toISOString(),
});

const defaultUuid = (): MenuParityUuid => {
  let counter = 0;
  return {
    generate: () => `menu-parity-${++counter}`,
  };
};

export function createMenuParityInfrastructure(
  options: CreateMenuParityInfrastructureOptions = {}
): MenuParityInfrastructure {
  const clock = options.clock ?? defaultClock();
  const uuid = options.uuid ?? defaultUuid();
  const legacyReadPort = options.legacyReadPort ?? new InMemoryLegacyMenuReadPort();
  const projectionReadPort = options.projectionReadPort ?? new InMemoryProjectionMenuReadPort();
  const reportRepository = options.reportRepository ?? createMenuParityReportRepository();
  const validator = createMenuParityValidator();
  const comparator = createMenuParityComparator({
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

    async validate(catalogId) {
      return Promise.resolve(validator.validateCatalogId(catalogId));
    },

    async compare(catalogId) {
      const validated = validator.validateCatalogId(catalogId);
      if (!validated.ok) return validated;
      return comparator.compare(catalogId);
    },

    async compareAndReport(catalogId) {
      const startedAt =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const telemetry = createMenuParityTelemetryEmitter(
        options.onTelemetry,
        'compareAndReport',
        catalogId
      );
      telemetry.parityStarted();

      const validated = validator.validateCatalogId(catalogId);
      if (!validated.ok) {
        telemetry.parityFailed(validated.error.code);
        return validated;
      }

      const compared = await comparator.compare(catalogId);
      if (!compared.ok) return compared;

      const durationMs = Math.max(
        0,
        Math.round(
          (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt
        )
      );

      const report = buildMenuParityReportRecord(
        uuid.generate(),
        compared.value,
        compared.value.catalogId,
        durationMs
      );
      await reportRepository.save(report);
      telemetry.parityCompleted(compared.value.outcome);
      return sdkOk(report);
    },

    async statistics() {
      const stats = reportRepository.getStatistics();
      return sdkOk(summarizeMenuParityStatistics(stats.totalCompared > 0 ? stats : EMPTY_MENU_PARITY_STATISTICS));
    },
  };
}

export {
  createMenuParityValidator,
  createMenuParityComparator,
  createMenuParityReportRepository,
  buildMenuParityReportRecord,
};
export { createMenuParityMapper } from './MenuParityMapper';
