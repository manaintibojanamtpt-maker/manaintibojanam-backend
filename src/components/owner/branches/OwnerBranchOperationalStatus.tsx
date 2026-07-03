/**
 * M5 PR-14 — operational availability panel for owner branch management.
 */

import React from 'react';
import { Activity, Clock3, Package, Users } from 'lucide-react';
import type { BranchOperationsAvailabilityDto } from '../../../sdk/branch/dto/operations';
import {
  buildOperationalStatusAriaLabel,
  formatOperationalAvailabilityLabel,
} from '../../../lib/owner-branches/ownerBranchViewHelpers';

interface OwnerBranchOperationalStatusProps {
  readonly availability: BranchOperationsAvailabilityDto;
}

export const OwnerBranchOperationalStatus: React.FC<OwnerBranchOperationalStatusProps> = ({
  availability,
}) => {
  const headline = formatOperationalAvailabilityLabel(availability);

  return (
    <section
      aria-label={buildOperationalStatusAriaLabel(availability)}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-red-400" aria-hidden="true" />
        <h2 className="text-sm font-black uppercase tracking-widest text-white/40">
          Operational availability
        </h2>
      </div>
      <p
        className={`mt-4 text-base font-bold ${
          availability.isOperationallyAvailable ? 'text-emerald-300' : 'text-amber-300'
        }`}
      >
        {headline}
      </p>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            Hours
          </dt>
          <dd className="mt-2 text-sm font-semibold text-white">
            {availability.hours.isOpen ? 'Open' : 'Closed'}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Capacity
          </dt>
          <dd className="mt-2 text-sm font-semibold text-white">
            {availability.capacity.activeOrders}/{availability.capacity.maxConcurrentOrders} orders
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 sm:col-span-2">
          <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
            <Package className="h-3.5 w-3.5" aria-hidden="true" />
            Inventory
          </dt>
          <dd className="mt-2 text-sm font-semibold text-white">
            {availability.inventory.isSufficient ? 'Sufficient' : 'Insufficient'} inventory coverage
          </dd>
        </div>
      </dl>

      {availability.blockers.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Blockers</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-100/80" role="list">
            {availability.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default OwnerBranchOperationalStatus;
