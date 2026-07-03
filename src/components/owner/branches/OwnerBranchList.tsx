/**
 * M5 PR-14 — branch list panel for owner branch management.
 */

import React from 'react';
import type { BranchSummary } from '../../../sdk/branch/dto/branch';
import type { BranchId } from '../../../sdk/branch/types/branded';
import { buildOwnerBranchListAriaLabel } from '../../../lib/owner-branches/ownerBranchViewHelpers';
import { OwnerBranchCard } from './OwnerBranchCard';

interface OwnerBranchListProps {
  readonly branches: readonly BranchSummary[];
  readonly selectedBranchId: BranchId | null;
  readonly onSelectBranch: (branchId: BranchId) => void;
}

export const OwnerBranchList: React.FC<OwnerBranchListProps> = ({
  branches,
  selectedBranchId,
  onSelectBranch,
}) => (
  <section aria-label={buildOwnerBranchListAriaLabel(branches.length)}>
    <div className="mb-4">
      <h2 className="text-sm font-black uppercase tracking-widest text-white/40">Branches</h2>
      <p className="mt-1 text-xs text-white/45">Read-only operational view</p>
    </div>
    <ul className="space-y-3" role="list">
      {branches.map((branch) => (
        <li key={String(branch.branchId)}>
          <OwnerBranchCard
            branch={branch}
            selected={selectedBranchId === branch.branchId}
            onSelect={onSelectBranch}
          />
        </li>
      ))}
    </ul>
  </section>
);

export default OwnerBranchList;
