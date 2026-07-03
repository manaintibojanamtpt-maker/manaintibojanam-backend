/**
 * Menu read adapter — routes reads between legacy and projection repositories (M7 PR-11).
 * NOT a production switch. NOT wired into createMenuSDK(). Default path remains legacy.
 */

import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type {
  Combo,
  ComboQuery,
  Menu,
  MenuCategory,
  MenuCategoryQuery,
  MenuItem,
  MenuItemQuery,
  MenuQuery,
} from '../dto';
import type {
  LegacyMenuReadPort,
  ProjectionMenuReadPort,
  MenuAdapterReadinessPort,
  MenuReadAdapterPort,
} from './menuAdapterPorts';
import {
  readMenuAdapterFlagDefault,
  type MenuAdapterFeatureFlagReader,
} from './menuAdapterFeatureFlags';
import {
  decideMenuReadSource,
  shouldFallbackOnMenuProjectionFailure,
} from '../../../domain/menu/adapter/MenuAdapterRules';
import { MENU_ADAPTER_FALLBACK_REASONS } from '../../../domain/menu/adapter/MenuAdapterMetadata';
import type { MenuAdapterDecision } from '../../../domain/menu/adapter/MenuAdapterDecision';
import { createLegacyMenuAdapter, type LegacyMenuAdapter } from './LegacyMenuAdapter';
import { createProjectionMenuAdapter, type ProjectionMenuAdapter } from './ProjectionMenuAdapter';
import { createMenuAdapterValidation, type MenuAdapterValidation } from './MenuAdapterValidation';
import type { MenuAdapterTelemetryHook } from './MenuAdapterTelemetry';
import { createMenuAdapterTelemetryEmitter } from './MenuAdapterTelemetry';
import { resolveMenuCatalogId } from './mapProjectionToMenuDto';

export interface MenuReadAdapterOptions {
  readonly featureFlags?: MenuAdapterFeatureFlagReader;
  readonly legacyRepository: LegacyMenuReadPort;
  readonly projectionRepository: ProjectionMenuReadPort;
  readonly readiness?: MenuAdapterReadinessPort;
  readonly legacyAdapter?: LegacyMenuAdapter;
  readonly projectionAdapter?: ProjectionMenuAdapter;
  readonly validator?: MenuAdapterValidation;
  readonly onTelemetry?: MenuAdapterTelemetryHook;
}

export class MenuReadAdapter implements MenuReadAdapterPort {
  private readonly legacyAdapter: LegacyMenuAdapter;
  private readonly projectionAdapter: ProjectionMenuAdapter;
  private readonly validator: MenuAdapterValidation;
  private cachedDecision: MenuAdapterDecision | null = null;

  constructor(private readonly options: MenuReadAdapterOptions) {
    this.legacyAdapter =
      options.legacyAdapter ?? createLegacyMenuAdapter(options.legacyRepository);
    this.projectionAdapter =
      options.projectionAdapter ?? createProjectionMenuAdapter(options.projectionRepository);
    this.validator = options.validator ?? createMenuAdapterValidation();
  }

  async resolveDecision(): SdkAsyncResult<MenuAdapterDecision> {
    const readFlag = this.options.featureFlags ?? readMenuAdapterFlagDefault;

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

    const decision = decideMenuReadSource({
      adapterFlagEnabled: readFlag('FF_MENU_PROJECTION_ADAPTER_ENABLED'),
      projectionReady,
      operationalGreen,
      projectionRepositoryHealthy,
    });

    this.cachedDecision = decision;
    return sdkOk(decision);
  }

  private async getDecision(method: string, catalogId?: string): Promise<MenuAdapterDecision> {
    if (this.cachedDecision) return this.cachedDecision;
    const resolved = await this.resolveDecision();
    if (!resolved.ok) {
      const telemetry = createMenuAdapterTelemetryEmitter(
        this.options.onTelemetry,
        method,
        catalogId
      );
      telemetry.adapterFailed(resolved.error.code);
      return {
        source: 'legacy',
        reason: MENU_ADAPTER_FALLBACK_REASONS.PROJECTION_READ_FAILED,
        fallback: true,
      };
    }
    return resolved.value;
  }

  private async routeRead<T>(
    method: string,
    catalogId: string | undefined,
    legacyRead: () => SdkAsyncResult<T>,
    projectionRead: () => SdkAsyncResult<T>
  ): SdkAsyncResult<T> {
    const telemetry = createMenuAdapterTelemetryEmitter(
      this.options.onTelemetry,
      method,
      catalogId
    );
    telemetry.adapterStarted();

    const decision = await this.getDecision(method, catalogId);
    if (decision.source === 'projection') {
      telemetry.projectionSelected();
      const projected = await projectionRead();
      if (projected.ok) {
        telemetry.adapterCompleted('projection');
        return projected;
      }
      if (shouldFallbackOnMenuProjectionFailure(decision)) {
        const reason =
          projected.error.code === 'NOT_FOUND'
            ? MENU_ADAPTER_FALLBACK_REASONS.PROJECTION_NOT_FOUND
            : projected.error.code === 'MAPPER_FAILED'
              ? MENU_ADAPTER_FALLBACK_REASONS.PROJECTION_MAPPER_FAILED
              : projected.error.code === 'TIMEOUT'
                ? MENU_ADAPTER_FALLBACK_REASONS.PROJECTION_TIMEOUT
                : MENU_ADAPTER_FALLBACK_REASONS.PROJECTION_READ_FAILED;
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
  }

  async getMenu(query: MenuQuery): SdkAsyncResult<Menu> {
    const validated = this.validator.validateMenuQuery(query);
    if (!validated.ok) {
      const telemetry = createMenuAdapterTelemetryEmitter(
        this.options.onTelemetry,
        'getMenu',
        resolveMenuCatalogId(query.tenantId, query.branchId)
      );
      telemetry.adapterStarted();
      telemetry.adapterFailed(validated.error.code);
      return validated;
    }

    const catalogId = resolveMenuCatalogId(query.tenantId, query.branchId);
    return this.routeRead(
      'getMenu',
      catalogId,
      () => this.legacyAdapter.getMenu(query),
      () => this.projectionAdapter.getMenu(query)
    );
  }

  async getMenuItem(query: MenuItemQuery): SdkAsyncResult<MenuItem> {
    const validated = this.validator.validateMenuItemQuery(query);
    if (!validated.ok) {
      const telemetry = createMenuAdapterTelemetryEmitter(
        this.options.onTelemetry,
        'getMenuItem',
        resolveMenuCatalogId(query.tenantId, query.branchId)
      );
      telemetry.adapterStarted();
      telemetry.adapterFailed(validated.error.code);
      return validated;
    }

    const catalogId = resolveMenuCatalogId(query.tenantId, query.branchId);
    return this.routeRead(
      'getMenuItem',
      catalogId,
      () => this.legacyAdapter.getMenuItem(query),
      () => this.projectionAdapter.getMenuItem(query)
    );
  }

  async listCategories(query: MenuCategoryQuery): SdkAsyncResult<MenuCategory[]> {
    const validated = this.validator.validateMenuCategoryQuery(query);
    if (!validated.ok) {
      const telemetry = createMenuAdapterTelemetryEmitter(
        this.options.onTelemetry,
        'listCategories',
        resolveMenuCatalogId(query.tenantId, query.branchId)
      );
      telemetry.adapterStarted();
      telemetry.adapterFailed(validated.error.code);
      return validated;
    }

    const catalogId = resolveMenuCatalogId(query.tenantId, query.branchId);
    return this.routeRead(
      'listCategories',
      catalogId,
      () => this.legacyAdapter.listCategories(query),
      () => this.projectionAdapter.listCategories(query)
    );
  }

  async getCombo(query: ComboQuery): SdkAsyncResult<Combo> {
    const validated = this.validator.validateComboQuery(query);
    if (!validated.ok) {
      const telemetry = createMenuAdapterTelemetryEmitter(
        this.options.onTelemetry,
        'getCombo',
        resolveMenuCatalogId(query.tenantId, query.branchId)
      );
      telemetry.adapterStarted();
      telemetry.adapterFailed(validated.error.code);
      return validated;
    }

    const catalogId = resolveMenuCatalogId(query.tenantId, query.branchId);
    return this.routeRead(
      'getCombo',
      catalogId,
      () => this.legacyAdapter.getCombo(query),
      () => this.projectionAdapter.getCombo(query)
    );
  }
}

export function createMenuReadAdapter(options: MenuReadAdapterOptions): MenuReadAdapter {
  return new MenuReadAdapter(options);
}
