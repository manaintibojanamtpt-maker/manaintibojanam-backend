/**
 * BranchSDK — routing policy DTOs (M5 PR-1 foundation).
 */

import type { BranchScoreSignal } from './score';

export interface BranchRoutingWeights {
  readonly distance: number;
  readonly eta: number;
  readonly deliveryFee: number;
  readonly capacityHeadroom: number;
  readonly inventoryAvailability: number;
  readonly openStatus: number;
}

export interface BranchFailoverPolicy {
  readonly enabled: boolean;
  readonly maxAttempts: number;
  readonly preferSameZone: boolean;
}

export interface BranchRoutingPolicy {
  readonly tenantId: string;
  readonly scoringWeights: BranchRoutingWeights;
  readonly failoverPolicy: BranchFailoverPolicy;
  readonly autoSelectEnabled: boolean;
  readonly schemaVersion: number;
}

export type BranchRoutingSignal = BranchScoreSignal;
