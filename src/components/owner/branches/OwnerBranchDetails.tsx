/**
 * M5 PR-14 — branch detail panel for owner branch management.
 */

import React from 'react';
import { MapPin } from 'lucide-react';
import type { BranchDetail } from '../../../sdk/branch/dto/branch';
import { formatBranchStatusLabel } from '../../../lib/owner-branches/ownerBranchViewHelpers';

interface OwnerBranchDetailsProps {
  readonly branch: BranchDetail;
}

export const OwnerBranchDetails: React.FC<OwnerBranchDetailsProps> = ({ branch }) => {
  const address = branch.location?.formattedAddress ?? 'Address not available';

  return (
    <section aria-labelledby="owner-branch-details-heading" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 id="owner-branch-details-heading" className="text-sm font-black uppercase tracking-widest text-white/40">
        Branch details
      </h2>
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xl font-bold text-white">{branch.name}</p>
          <p className="mt-1 text-sm text-white/50">Slug: {branch.slug}</p>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">Status</dt>
            <dd className="mt-1 text-sm font-semibold text-white">
              {formatBranchStatusLabel(branch.status)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">Default branch</dt>
            <dd className="mt-1 text-sm font-semibold text-white">
              {branch.isDefault ? 'Yes' : 'No'}
            </dd>
          </div>
        </dl>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Location</p>
              <p className="mt-1 text-sm text-white/80">{address}</p>
              {branch.location?.point && (
                <p className="mt-1 text-xs text-white/40">
                  {branch.location.point.lat.toFixed(4)}, {branch.location.point.lng.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OwnerBranchDetails;
