/**
 * M5 PR-14 — loading, empty, error, and disabled states for owner branch UI.
 */

import React from 'react';
import { AlertCircle, Building2, Loader2, RefreshCw, ShieldOff } from 'lucide-react';
import type { OwnerBranchPresentationError } from '../../../lib/owner-branches/types';
import { formatOwnerBranchErrorMessage } from '../../../lib/owner-branches/ownerBranchViewHelpers';

export const OwnerBranchLoadingState: React.FC<{ message?: string }> = ({
  message = 'Loading branch information…',
}) => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center"
  >
    <Loader2 className="mb-4 h-8 w-8 animate-spin text-red-400" aria-hidden="true" />
    <p className="text-sm font-semibold text-white/80">{message}</p>
  </div>
);

export const OwnerBranchEmptyState: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center"
  >
    <Building2 className="mb-4 h-10 w-10 text-white/30" aria-hidden="true" />
    <h2 className="text-lg font-bold text-white">No branches yet</h2>
    <p className="mt-2 max-w-md text-sm text-white/50">
      Branch locations will appear here once they are configured for your brand.
    </p>
  </div>
);

interface OwnerBranchErrorStateProps {
  readonly error: OwnerBranchPresentationError;
  readonly onRetry?: () => void;
}

export const OwnerBranchErrorState: React.FC<OwnerBranchErrorStateProps> = ({
  error,
  onRetry,
}) => (
  <div
    role="alert"
    aria-live="assertive"
    className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-8"
  >
    <div className="flex items-start gap-3">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-bold text-rose-200">Unable to load branch data</h2>
        <p className="mt-2 text-sm text-rose-100/80">{formatOwnerBranchErrorMessage(error)}</p>
        {onRetry && error.retryable !== false && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-rose-600"
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        )}
      </div>
    </div>
  </div>
);

export const OwnerBranchDisabledState: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center"
  >
    <ShieldOff className="mx-auto mb-4 h-10 w-10 text-white/30" aria-hidden="true" />
    <h2 className="text-lg font-bold text-white">Branch management is not enabled</h2>
    <p className="mt-2 text-sm text-white/50">
      Enable <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">FF_BRANCH_OWNER_ENABLED</code>{' '}
      to view branch operations in the owner portal.
    </p>
  </div>
);
