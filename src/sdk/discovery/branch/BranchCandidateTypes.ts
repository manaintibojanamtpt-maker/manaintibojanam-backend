/**
 * DiscoverySDK — branch candidate read types (M5 PR-6).
 * Neutral shapes for future `branches/` reads — no Firestore, no BranchSDK.
 */

import type { SdkAsyncResult } from '../../core/result';
import type { BranchId } from '../../branch/types/branded';
import type { TenantId } from '../../core/types';
import type { DiscoveryCandidate } from '../dto/candidates';

export type DiscoveryBranchStatus = 'draft' | 'active' | 'closed' | 'suspended';

/** Future: `branches/{branchId}` read model for Discovery expansion. */
export interface DiscoveryBranchReadRecord {
  readonly branchId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly slug: string;
  readonly status: DiscoveryBranchStatus;
  readonly isDefault: boolean;
  readonly location: {
    readonly lat: number;
    readonly lng: number;
    readonly geohash?: string;
  };
  readonly maxRadiusKm?: number;
  readonly prepTimeMins?: number;
  readonly isOpen?: boolean;
  readonly rating?: number;
}

/** Brand (tenant) with zero or more branch fulfillment units. */
export interface BrandBranchCollection {
  readonly tenantId: TenantId;
  readonly brandName: string;
  readonly brandSlug: string;
  readonly branches: readonly DiscoveryBranchReadRecord[];
}

export interface BranchDiscoveryReadPort {
  listActiveBranchesByTenantIds(
    tenantIds: readonly TenantId[]
  ): SdkAsyncResult<readonly DiscoveryBranchReadRecord[]>;
}

export interface BranchCandidateExpansionResult {
  readonly candidates: readonly DiscoveryCandidate[];
  readonly tenantCount: number;
  readonly branchCount: number;
  readonly expandedTenantCount: number;
  readonly fallbackTenantCount: number;
  readonly usedTenantAsBranch: boolean;
}

export type BranchCandidateExpansionMode = 'tenant_as_branch' | 'multi_branch';

export const toDiscoveryBranchId = (branchId: string): BranchId => branchId as BranchId;
