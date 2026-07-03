/** Menu adapter decision (M7 PR-11). Pure domain — no SDK imports. */

import type { MenuReadSource } from './MenuReadSource';

export interface MenuAdapterDecision {
  readonly source: MenuReadSource;
  readonly reason: string;
  readonly fallback: boolean;
}

export interface MenuAdapterReadinessContext {
  readonly adapterFlagEnabled: boolean;
  readonly projectionReady: boolean;
  readonly operationalGreen: boolean;
  readonly projectionRepositoryHealthy: boolean;
}

export function createLegacyMenuDecision(reason: string, fallback = false): MenuAdapterDecision {
  return { source: 'legacy', reason, fallback };
}

export function createProjectionMenuDecision(reason: string): MenuAdapterDecision {
  return { source: 'projection', reason, fallback: false };
}
