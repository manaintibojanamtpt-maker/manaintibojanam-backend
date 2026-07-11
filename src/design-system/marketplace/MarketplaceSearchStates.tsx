import React from 'react';
import { AlertCircle, Loader2, MapPin, RefreshCw, Search, UtensilsCrossed } from 'lucide-react';
import type { MarketplaceSearchViewModel } from '../../lib/marketplace/searchTypes';

interface MarketplaceSearchStatesProps {
  readonly view: MarketplaceSearchViewModel;
  readonly onRetry: () => void;
  readonly onDetectLocation: () => void;
  readonly onManualSubmit: (address: string) => void;
  readonly detecting?: boolean;
  readonly manualSubmitting?: boolean;
}

export const MarketplaceSearchStates: React.FC<MarketplaceSearchStatesProps> = ({
  view,
  onRetry,
  onDetectLocation,
  onManualSubmit,
  detecting = false,
  manualSubmitting = false,
}) => {
  const [manualAddress, setManualAddress] = React.useState('');

  if (view.status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-white/70">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF7A00]" />
        <p className="text-sm">Searching nearby restaurants…</p>
      </div>
    );
  }

  if (
    view.status === 'location_required' ||
    view.status === 'location_denied' ||
    view.status === 'location_unavailable'
  ) {
    const title =
      view.status === 'location_denied'
        ? 'Location permission denied'
        : view.status === 'location_unavailable'
          ? 'Location unavailable'
          : 'Set your delivery location to search';

    const description =
      view.status === 'location_denied'
        ? 'Enable location access or enter your address manually to search nearby restaurants.'
        : view.status === 'location_unavailable'
          ? view.error?.userMessage ?? 'We could not detect your location.'
          : 'Search requires a delivery location so we can find restaurants near you.';

    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FF7A00]/15">
          <MapPin className="h-6 w-6 text-[#FF7A00]" />
        </div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-white/60">{description}</p>

        <button
          type="button"
          onClick={onDetectLocation}
          disabled={detecting}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#FF7A00] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ff8f2b] disabled:opacity-60"
        >
          {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          Use my location
        </button>

        <form
          className="mt-5 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (manualAddress.trim()) {
              onManualSubmit(manualAddress.trim());
            }
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={manualAddress}
              onChange={(event) => setManualAddress(event.target.value)}
              placeholder="Enter area, city, or pincode"
              className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-[#FF7A00]/50 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={manualSubmitting || !manualAddress.trim()}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white hover:border-[#FF7A00]/40 disabled:opacity-50"
          >
            {manualSubmitting ? '…' : 'Set'}
          </button>
        </form>
      </div>
    );
  }

  if (view.status === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <UtensilsCrossed className="h-10 w-10 text-white/30" />
        <h2 className="text-lg font-semibold text-white">No restaurants found</h2>
        <p className="max-w-md text-sm text-white/60">
          No matches for &ldquo;{view.query}&rdquo; near your location. Try a different search or browse
          nearby kitchens.
        </p>
        {view.retryable !== false && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:border-[#FF7A00]/40"
          >
            <RefreshCw className="h-4 w-4" />
            Retry search
          </button>
        )}
      </div>
    );
  }

  if (view.status === 'error' || view.status === 'disabled') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertCircle className="h-10 w-10 text-red-400/80" />
        <h2 className="text-lg font-semibold text-white">
          {view.status === 'disabled' ? 'Search unavailable' : 'Search failed'}
        </h2>
        <p className="max-w-md text-sm text-white/60">
          {view.error?.userMessage ?? 'Please try again in a moment.'}
        </p>
        {view.retryable !== false && view.status === 'error' && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
          >
            <RefreshCw className="h-4 w-4" />
            Retry search
          </button>
        )}
      </div>
    );
  }

  return null;
};

export default MarketplaceSearchStates;
