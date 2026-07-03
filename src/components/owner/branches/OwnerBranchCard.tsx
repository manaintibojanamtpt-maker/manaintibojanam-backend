/**
 * M5 PR-14 — branch summary card for owner branch list.
 */

import React from 'react';
import { CheckCircle2, MapPin } from 'lucide-react';
import type { BranchSummary } from '../../../sdk/branch/dto/branch';
import type { BranchId } from '../../../sdk/branch/types/branded';
import { formatBranchStatusLabel } from '../../../lib/owner-branches/ownerBranchViewHelpers';

interface OwnerBranchCardProps {
  readonly branch: BranchSummary;
  readonly selected: boolean;
  readonly onSelect: (branchId: BranchId) => void;
}

export const OwnerBranchCard: React.FC<OwnerBranchCardProps> = ({
  branch,
  selected,
  onSelect,
}) => {
  const statusLabel = formatBranchStatusLabel(branch.status);

  return (
    <button
      type="button"
      onClick={() => onSelect(branch.branchId)}
      aria-pressed={selected}
      aria-label={`${branch.name}, ${statusLabel}${branch.isDefault ? ', default branch' : ''}`}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
        selected
          ? 'border-red-500/40 bg-red-500/10 shadow-[0_0_0_1px_rgba(239,68,68,0.15)]'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{branch.name}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-white/45">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{branch.slug}</span>
          </p>
        </div>
        {branch.isDefault && (
          <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
            Default
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${
            branch.status === 'active'
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-white/10 text-white/60'
          }`}
        >
          {selected && <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />}
          {statusLabel}
        </span>
      </div>
    </button>
  );
};

export default OwnerBranchCard;
