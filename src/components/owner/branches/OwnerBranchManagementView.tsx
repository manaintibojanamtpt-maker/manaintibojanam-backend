/**
 * M5 PR-14 — testable owner branch management view shell.
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { BranchId } from '../../../sdk/branch/types/branded';
import type { OwnerBranchManagementViewState } from '../../../hooks/ownerBranchManagementTypes';
import { OwnerBranchDetails } from './OwnerBranchDetails';
import { OwnerBranchEta, OwnerBranchValidation } from './OwnerBranchEta';
import { OwnerBranchList } from './OwnerBranchList';
import { OwnerBranchOperationalStatus } from './OwnerBranchOperationalStatus';
import {
  OwnerBranchDisabledState,
  OwnerBranchEmptyState,
  OwnerBranchErrorState,
  OwnerBranchLoadingState,
} from './OwnerBranchStates';

export interface OwnerBranchManagementViewProps extends OwnerBranchManagementViewState {
  readonly onSelectBranch: (branchId: BranchId) => void;
  readonly onRefresh: () => void;
  readonly onRetry: () => void;
}

export const OwnerBranchManagementView: React.FC<OwnerBranchManagementViewProps> = ({
  phase,
  branches,
  selectedBranchId,
  branch,
  availability,
  validation,
  estimate,
  error,
  isRefreshing,
  onSelectBranch,
  onRefresh,
  onRetry,
}) => (
  <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">Branch management</h1>
        <p className="mt-1 text-sm text-white/50">
          Read-only view of branch operations, availability, and serviceability.
        </p>
      </div>
      {phase !== 'disabled' && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing || phase === 'loading'}
          aria-label="Refresh branch data"
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          Refresh
        </button>
      )}
    </header>

    {phase === 'disabled' && <OwnerBranchDisabledState />}
    {phase === 'loading' && !branch && <OwnerBranchLoadingState />}
    {phase === 'empty' && <OwnerBranchEmptyState />}
    {phase === 'error' && error && <OwnerBranchErrorState error={error} onRetry={onRetry} />}

    {(phase === 'ready' || (phase === 'loading' && branch) || (phase === 'error' && branch)) && (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <OwnerBranchList
          branches={branches}
          selectedBranchId={selectedBranchId}
          onSelectBranch={onSelectBranch}
        />
        <div className="space-y-4">
          {branch && <OwnerBranchDetails branch={branch} />}
          {phase === 'loading' && branch && (
            <OwnerBranchLoadingState message="Loading operational insights…" />
          )}
          {availability && <OwnerBranchOperationalStatus availability={availability} />}
          {validation && <OwnerBranchValidation validation={validation} />}
          {estimate && <OwnerBranchEta estimate={estimate} />}
        </div>
      </div>
    )}
  </div>
);

export default OwnerBranchManagementView;
