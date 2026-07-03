/**
 * M5 PR-14 — ETA and validation panels for owner branch management.
 */

import React from 'react';
import { Clock, ShieldCheck } from 'lucide-react';
import type { BranchETAEstimate, BranchValidationResult } from '../../../sdk/branch/dto';
import { formatEtaLabel, formatValidationLabel } from '../../../lib/owner-branches/ownerBranchViewHelpers';

interface OwnerBranchEtaProps {
  readonly estimate: BranchETAEstimate;
}

export const OwnerBranchEta: React.FC<OwnerBranchEtaProps> = ({ estimate }) => (
  <section aria-label="Estimated delivery time" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4 text-red-400" aria-hidden="true" />
      <h2 className="text-sm font-black uppercase tracking-widest text-white/40">ETA estimate</h2>
    </div>
    <p className="mt-4 text-base font-bold text-white">{formatEtaLabel(estimate)}</p>
    <p className="mt-2 text-xs text-white/45">Confidence: {estimate.confidence}</p>
  </section>
);

interface OwnerBranchValidationProps {
  readonly validation: BranchValidationResult;
}

export const OwnerBranchValidation: React.FC<OwnerBranchValidationProps> = ({ validation }) => (
  <section aria-label="Branch validation status" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
    <div className="flex items-center gap-2">
      <ShieldCheck className="h-4 w-4 text-red-400" aria-hidden="true" />
      <h2 className="text-sm font-black uppercase tracking-widest text-white/40">Validation</h2>
    </div>
    <p
      className={`mt-4 text-base font-bold ${
        validation.isValid ? 'text-emerald-300' : 'text-rose-300'
      }`}
    >
      {formatValidationLabel(validation)}
    </p>
    {validation.issues.length > 0 && (
      <ul className="mt-3 space-y-1 text-sm text-white/60" role="list">
        {validation.issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    )}
  </section>
);

export default OwnerBranchEta;
