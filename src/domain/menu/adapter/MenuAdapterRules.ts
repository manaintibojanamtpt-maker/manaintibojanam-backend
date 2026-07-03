/** Menu adapter routing rules (M7 PR-11). Pure domain — no SDK imports. */

import { MENU_ADAPTER_FALLBACK_REASONS } from './MenuAdapterMetadata';
import {
  createLegacyMenuDecision,
  createProjectionMenuDecision,
  type MenuAdapterDecision,
  type MenuAdapterReadinessContext,
} from './MenuAdapterDecision';

export function decideMenuReadSource(context: MenuAdapterReadinessContext): MenuAdapterDecision {
  if (!context.adapterFlagEnabled) {
    return createLegacyMenuDecision(MENU_ADAPTER_FALLBACK_REASONS.FLAG_DISABLED);
  }

  if (!context.projectionReady) {
    return createLegacyMenuDecision(MENU_ADAPTER_FALLBACK_REASONS.PROJECTION_NOT_READY, true);
  }

  if (!context.operationalGreen) {
    return createLegacyMenuDecision(MENU_ADAPTER_FALLBACK_REASONS.OPERATIONAL_NOT_GREEN, true);
  }

  if (!context.projectionRepositoryHealthy) {
    return createLegacyMenuDecision(MENU_ADAPTER_FALLBACK_REASONS.PROJECTION_UNHEALTHY, true);
  }

  return createProjectionMenuDecision('Menu projection adapter gates satisfied');
}

export function shouldFallbackOnMenuProjectionFailure(decision: MenuAdapterDecision): boolean {
  return decision.source === 'projection' || decision.fallback;
}
