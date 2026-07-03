/**
 * M5 PR-14 — owner branch management presentation hook.
 * All data flows through OwnerBranchFacade via injectable API.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BranchDetail, BranchETAEstimate, BranchValidationResult } from '../sdk/branch/dto';
import type { BranchOperationsAvailabilityDto } from '../sdk/branch/dto/operations';
import type { BranchSummary } from '../sdk/branch/dto/branch';
import type { BranchId } from '../sdk/branch/types/branded';
import type { TenantId } from '../sdk/core/types';
import {
  createOwnerBranchManagementApi,
  defaultOwnerBranchManagementApi,
  type OwnerBranchManagementApi,
} from '../lib/owner-branches/ownerBranchManagementApi';
import type { OwnerBranchPresentationError } from '../lib/owner-branches/types';
import { useOwnerTenantId } from './useOwnerTenantId';
import type {
  OwnerBranchManagementPhase,
  OwnerBranchManagementViewState,
} from './ownerBranchManagementTypes';

export interface UseOwnerBranchManagementOptions {
  readonly tenantId?: string | null;
  readonly api?: OwnerBranchManagementApi;
}

const INITIAL_STATE: OwnerBranchManagementViewState = {
  phase: 'loading',
  branches: [],
  selectedBranchId: null,
  branch: null,
  availability: null,
  validation: null,
  estimate: null,
  error: null,
  sessionStatus: 'idle',
  isRefreshing: false,
};

export function useOwnerBranchManagement(
  options: UseOwnerBranchManagementOptions = {}
): OwnerBranchManagementViewState & {
  selectBranch: (branchId: BranchId) => Promise<void>;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
} {
  const resolvedTenantId = options.tenantId ?? useOwnerTenantId();
  const api = options.api ?? defaultOwnerBranchManagementApi;
  const [state, setState] = useState<OwnerBranchManagementViewState>(INITIAL_STATE);

  const tenantId = resolvedTenantId as TenantId | null;

  const loadBranchInsights = useCallback(
    async (branch: BranchDetail): Promise<OwnerBranchPresentationError | null> => {
      if (!tenantId) {
        return null;
      }

      const customerPoint = branch.location?.point;

      const [availabilityOutcome, validationOutcome, etaOutcome] = await Promise.all([
        api.getOperationalAvailability({
          branchId: branch.branchId,
          tenantId,
          branchName: branch.name,
        }),
        api.validateBranch({
          tenantId,
          branchId: branch.branchId,
          orderType: 'delivery',
          ...(customerPoint ? { customerPoint } : {}),
        }),
        api.estimateEta({
          tenantId,
          branchId: branch.branchId,
          orderType: 'delivery',
          ...(customerPoint ? { customerPoint } : {}),
        }),
      ]);

      setState((current) => ({
        ...current,
        availability: availabilityOutcome.ok ? availabilityOutcome.availability : null,
        validation: validationOutcome.ok ? validationOutcome.validation : null,
        estimate: etaOutcome.ok ? etaOutcome.estimate : null,
        phase: 'ready',
      }));

      if (!availabilityOutcome.ok) {
        return availabilityOutcome.error;
      }
      if (!validationOutcome.ok) {
        return validationOutcome.error;
      }
      if (!etaOutcome.ok) {
        return etaOutcome.error;
      }
      return null;
    },
    [api, tenantId]
  );

  const selectBranch = useCallback(
    async (branchId: BranchId) => {
      setState((current) => ({
        ...current,
        selectedBranchId: branchId,
        phase: 'loading',
        branch: null,
        availability: null,
        validation: null,
        estimate: null,
        error: null,
      }));

      const outcome = await api.getBranch({ branchId });
      if (!outcome.ok) {
        setState((current) => ({
          ...current,
          phase: 'error',
          error: outcome.error,
        }));
        return;
      }

      setState((current) => ({
        ...current,
        branch: outcome.branch,
      }));

      const insightError = await loadBranchInsights(outcome.branch);
      if (insightError) {
        setState((current) => ({
          ...current,
          phase: 'error',
          error: insightError,
        }));
      }
    },
    [api, loadBranchInsights]
  );

  const loadBranches = useCallback(
    async (isRefresh = false) => {
      if (!api.isEnabled()) {
        setState((current) => ({
          ...current,
          phase: 'disabled',
          sessionStatus: 'disabled',
        }));
        return;
      }

      if (!tenantId) {
        return;
      }

      setState((current) => ({
        ...current,
        phase: current.phase === 'ready' && isRefresh ? current.phase : 'loading',
        isRefreshing: isRefresh,
        error: null,
      }));

      const outcome = await api.listBranches({ tenantId });

      if (!outcome.ok) {
        setState((current) => ({
          ...current,
          phase: 'error',
          error: outcome.error,
          isRefreshing: false,
        }));
        return;
      }

      if (outcome.branches.length === 0) {
        setState((current) => ({
          ...current,
          phase: 'empty',
          branches: [],
          selectedBranchId: null,
          branch: null,
          availability: null,
          validation: null,
          estimate: null,
          isRefreshing: false,
        }));
        return;
      }

      setState((current) => ({
        ...current,
        branches: outcome.branches,
        isRefreshing: false,
      }));

      await selectBranch(outcome.branches[0]!.branchId);
    },
    [api, tenantId, selectBranch]
  );

  const refresh = useCallback(async () => {
    api.clearSession();
    await loadBranches(true);
  }, [api, loadBranches]);

  const retry = useCallback(async () => {
    setState((current) => ({ ...current, phase: 'loading', error: null }));
    const outcome = await api.retry();

    if (!outcome.ok) {
      setState((current) => ({
        ...current,
        phase: 'error',
        error: outcome.error,
      }));
      return;
    }

    if ('branches' in outcome) {
      setState((current) => ({
        ...current,
        branches: outcome.branches,
        phase: outcome.branches.length === 0 ? 'empty' : 'ready',
        error: null,
      }));
      if (outcome.branches.length > 0) {
        await selectBranch(outcome.branches[0]!.branchId);
      }
      return;
    }

    if ('branch' in outcome) {
      setState((current) => ({
        ...current,
        branch: outcome.branch,
        error: null,
      }));
      const insightError = await loadBranchInsights(outcome.branch);
      setState((current) => ({
        ...current,
        phase: insightError ? 'error' : 'ready',
        error: insightError,
      }));
      return;
    }

    if ('availability' in outcome) {
      setState((current) => ({
        ...current,
        availability: outcome.availability,
        phase: 'ready',
        error: null,
      }));
      return;
    }

    if ('validation' in outcome) {
      setState((current) => ({
        ...current,
        validation: outcome.validation,
        phase: 'ready',
        error: null,
      }));
      return;
    }

    if ('estimate' in outcome) {
      setState((current) => ({
        ...current,
        estimate: outcome.estimate,
        phase: 'ready',
        error: null,
      }));
    }
  }, [api, loadBranchInsights, selectBranch]);

  useEffect(() => {
    const unsubscribe = api.subscribeSession((snapshot) => {
      setState((current) => ({
        ...current,
        sessionStatus: snapshot.status,
        error: snapshot.lastError ?? current.error,
      }));
    });

    return unsubscribe;
  }, [api]);

  useEffect(() => {
    void loadBranches(false);
  }, [loadBranches]);

  return useMemo(
    () => ({
      ...state,
      selectBranch,
      refresh,
      retry,
    }),
    [state, selectBranch, refresh, retry]
  );
}

export { createOwnerBranchManagementApi };
export type {
  OwnerBranchManagementPhase,
  OwnerBranchManagementViewState,
} from './ownerBranchManagementTypes';
