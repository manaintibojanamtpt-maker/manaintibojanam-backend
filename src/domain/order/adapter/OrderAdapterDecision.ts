/** Order adapter decision (M6 PR-11). Pure domain — no SDK imports. */

import type { OrderReadSource } from './OrderReadSource';

export interface OrderAdapterDecision {
  readonly source: OrderReadSource;
  readonly reason: string;
  readonly fallback: boolean;
}

export interface OrderAdapterReadinessContext {
  readonly adapterFlagEnabled: boolean;
  readonly parityReady: boolean;
  readonly operationalGreen: boolean;
  readonly projectionRepositoryAvailable: boolean;
}

export function createLegacyDecision(reason: string, fallback = false): OrderAdapterDecision {
  return { source: 'legacy', reason, fallback };
}

export function createProjectionDecision(reason: string): OrderAdapterDecision {
  return { source: 'projection', reason, fallback: false };
}
