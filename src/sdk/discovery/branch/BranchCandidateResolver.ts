/**
 * DiscoverySDK — expand tenant brands to branch discovery candidates (M5 PR-6).
 * Discovery discovers and ranks — BranchSDK owns selection (forbidden here).
 */

import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { BranchFeatureFlagReader } from '../../branch/core/featureFlags';
import { readBranchFlagDefault } from '../../branch/core/featureFlags';
import type { DiscoveryCandidate } from '../dto/candidates';
import {
  mapTenantToDiscoveryCandidate,
  mapTenantsToDiscoveryCandidates,
} from '../repository/mappers/DiscoveryCandidateMapper';
import type { TenantReadRecord } from '../repository/ports/TenantRepositoryPort';
import type { TenantId } from '../../core/types';
import {
  mapBranchesToDiscoveryCandidates,
  sortDiscoveryCandidatesDeterministic,
} from './BranchCandidateMapper';
import {
  createBranchCandidateTelemetryTimer,
  recordBranchCandidateExpansionComplete,
  recordBranchCandidateExpansionStart,
  recordBranchCandidateFlagOff,
  recordBranchCandidateTenantFallback,
  type BranchCandidateTelemetryHook,
} from './BranchCandidateTelemetry';
import type {
  BranchCandidateExpansionResult,
  BranchDiscoveryReadPort,
  DiscoveryBranchReadRecord,
} from './BranchCandidateTypes';

export interface BranchCandidateResolverDeps {
  readonly branchDiscoveryEnabled?: boolean;
  readonly featureFlags?: BranchFeatureFlagReader;
  readonly branchReadPort?: BranchDiscoveryReadPort;
  readonly onTelemetry?: BranchCandidateTelemetryHook;
}

export interface BranchCandidateResolverOptions extends BranchCandidateResolverDeps {
  readonly tenants: readonly TenantReadRecord[];
}

const resolveBranchDiscoveryEnabled = (deps: BranchCandidateResolverDeps): boolean => {
  if (deps.branchDiscoveryEnabled !== undefined) {
    return deps.branchDiscoveryEnabled;
  }

  const readFlag = deps.featureFlags ?? readBranchFlagDefault;
  return readFlag('FF_BRANCH_DISCOVERY_ENABLED');
};

const groupBranchesByTenant = (
  branches: readonly DiscoveryBranchReadRecord[]
): Map<string, DiscoveryBranchReadRecord[]> => {
  const grouped = new Map<string, DiscoveryBranchReadRecord[]>();

  for (const branch of branches) {
    const existing = grouped.get(branch.tenantId) ?? [];
    existing.push(branch);
    grouped.set(branch.tenantId, existing);
  }

  return grouped;
};

const expandTenantToCandidates = (
  tenant: TenantReadRecord,
  branches: readonly DiscoveryBranchReadRecord[]
): {
  readonly candidates: DiscoveryCandidate[];
  readonly expanded: boolean;
  readonly usedFallback: boolean;
} => {
  const mapped = mapBranchesToDiscoveryCandidates(branches, tenant);
  if (mapped.length > 0) {
    return {
      candidates: mapped,
      expanded: true,
      usedFallback: false,
    };
  }

  const fallback = mapTenantToDiscoveryCandidate(tenant);
  return {
    candidates: fallback ? [fallback] : [],
    expanded: false,
    usedFallback: Boolean(fallback),
  };
};

export const resolveTenantAsBranchCandidates = (
  tenants: readonly TenantReadRecord[],
  onTelemetry?: BranchCandidateTelemetryHook
): BranchCandidateExpansionResult => {
  const candidates = mapTenantsToDiscoveryCandidates(tenants);
  recordBranchCandidateFlagOff(onTelemetry, tenants.length, candidates.length);

  return {
    candidates,
    tenantCount: tenants.length,
    branchCount: 0,
    expandedTenantCount: 0,
    fallbackTenantCount: candidates.length,
    usedTenantAsBranch: true,
  };
};

export async function resolveDiscoveryBranchCandidates(
  options: BranchCandidateResolverOptions
): Promise<SdkAsyncResult<BranchCandidateExpansionResult>> {
  const { tenants, onTelemetry } = options;
  const enabled = resolveBranchDiscoveryEnabled(options);

  if (!enabled || !options.branchReadPort) {
    return sdkOk(resolveTenantAsBranchCandidates(tenants, onTelemetry));
  }

  const timer = createBranchCandidateTelemetryTimer();
  recordBranchCandidateExpansionStart(onTelemetry, 'multi_branch', tenants.length);

  const tenantIds = tenants.map((tenant) => tenant.id as TenantId);
  const branchResult = await options.branchReadPort.listActiveBranchesByTenantIds(tenantIds);
  if (branchResult.ok === false) {
    return branchResult;
  }

  const grouped = groupBranchesByTenant(branchResult.value);
  const candidates: DiscoveryCandidate[] = [];
  let expandedTenantCount = 0;
  let fallbackTenantCount = 0;
  let branchCount = 0;

  for (const tenant of tenants) {
    const tenantBranches = grouped.get(tenant.id) ?? [];
    branchCount += tenantBranches.length;
    const expanded = expandTenantToCandidates(tenant, tenantBranches);

    if (expanded.expanded) {
      expandedTenantCount += 1;
    }
    if (expanded.usedFallback) {
      fallbackTenantCount += 1;
    }

    candidates.push(...expanded.candidates);
  }

  if (fallbackTenantCount > 0) {
    recordBranchCandidateTenantFallback(onTelemetry, {
      mode: 'multi_branch',
      tenantCount: tenants.length,
      fallbackTenantCount,
    });
  }

  const sorted = sortDiscoveryCandidatesDeterministic(candidates);
  const durationMs = timer();

  recordBranchCandidateExpansionComplete(onTelemetry, {
    mode: 'multi_branch',
    tenantCount: tenants.length,
    branchCount,
    candidateCount: sorted.length,
    expandedTenantCount,
    fallbackTenantCount,
    durationMs,
  });

  return sdkOk({
    candidates: sorted,
    tenantCount: tenants.length,
    branchCount,
    expandedTenantCount,
    fallbackTenantCount,
    usedTenantAsBranch: false,
  });
}

export { resolveBranchDiscoveryEnabled };
