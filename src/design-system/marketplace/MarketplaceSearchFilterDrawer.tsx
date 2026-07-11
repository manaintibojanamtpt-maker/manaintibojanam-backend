import React from 'react';
import { X } from 'lucide-react';
import {
  MARKETPLACE_DELIVERY_TIME_FILTER_OPTIONS,
  MARKETPLACE_DISTANCE_FILTER_OPTIONS,
  MARKETPLACE_RATING_FILTER_OPTIONS,
  type MarketplaceSearchFilterState,
} from '../../lib/marketplace/searchFilterTypes';

interface MarketplaceSearchFilterDrawerProps {
  readonly open: boolean;
  readonly filters: MarketplaceSearchFilterState;
  readonly onClose: () => void;
  readonly onApply: (filters: MarketplaceSearchFilterState) => void;
  readonly onReset: () => void;
}

const optionClass = (active: boolean) =>
  active
    ? 'border-[#FF7A00]/50 bg-[#FF7A00]/15 text-[#FF7A00]'
    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20';

export const MarketplaceSearchFilterDrawer: React.FC<MarketplaceSearchFilterDrawerProps> = ({
  open,
  filters,
  onClose,
  onApply,
  onReset,
}) => {
  const [draft, setDraft] = React.useState(filters);

  React.useEffect(() => {
    if (open) {
      setDraft(filters);
    }
  }, [filters, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Search filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white"
            aria-label="Close filters"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              Max distance
            </p>
            <div className="flex flex-wrap gap-2">
              {MARKETPLACE_DISTANCE_FILTER_OPTIONS.map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      maxDistanceKm: current.maxDistanceKm === km ? undefined : km,
                    }))
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs ${optionClass(draft.maxDistanceKm === km)}`}
                >
                  ≤ {km} km
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              Minimum rating
            </p>
            <div className="flex flex-wrap gap-2">
              {MARKETPLACE_RATING_FILTER_OPTIONS.map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      minRating: current.minRating === rating ? undefined : rating,
                    }))
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs ${optionClass(draft.minRating === rating)}`}
                >
                  {rating}+
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              Max delivery time
            </p>
            <div className="flex flex-wrap gap-2">
              {MARKETPLACE_DELIVERY_TIME_FILTER_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      maxDeliveryMins: current.maxDeliveryMins === mins ? undefined : mins,
                    }))
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs ${optionClass(draft.maxDeliveryMins === mins)}`}
                >
                  ≤ {mins} min
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/80 hover:border-white/25"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="flex-1 rounded-xl bg-[#FF7A00] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#ff8f2b]"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceSearchFilterDrawer;
