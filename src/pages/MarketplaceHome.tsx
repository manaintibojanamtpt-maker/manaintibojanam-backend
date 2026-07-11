import React, { useState } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { EnterpriseHeader } from '../components/marketing/EnterpriseHeader';
import { EnterpriseFooter } from '../components/EnterpriseFooter';
import { MarketplaceHomeStates } from '../components/marketplace/MarketplaceHomeStates';
import {
  MarketplaceKitchenCardView,
  MarketplaceSearchBar,
  MarketplaceSearchResults,
} from '../design-system';
import { useMarketplaceHome } from '../hooks/useMarketplaceHome';
import { useMarketplaceSearch } from '../hooks/useMarketplaceSearch';

const MarketplaceHome: React.FC = () => {
  const { view, refresh, retry, detectLocation, setManualLocation } = useMarketplaceHome();
  const search = useMarketplaceSearch();
  const [detecting, setDetecting] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [searchDetecting, setSearchDetecting] = useState(false);
  const [searchManualSubmitting, setSearchManualSubmitting] = useState(false);

  const handleDetect = async () => {
    setDetecting(true);
    try {
      await detectLocation();
    } finally {
      setDetecting(false);
    }
  };

  const handleManual = async (address: string) => {
    setManualSubmitting(true);
    try {
      await setManualLocation(address);
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleSearchDetect = async () => {
    setSearchDetecting(true);
    try {
      await search.retryWithLocationDetection();
    } finally {
      setSearchDetecting(false);
    }
  };

  const handleSearchManual = async (address: string) => {
    setSearchManualSubmitting(true);
    try {
      await search.setManualLocationAndSearch(address);
    } finally {
      setSearchManualSubmitting(false);
    }
  };

  const showDiscoveryList = !search.isSearchMode && view.status === 'success' && view.kitchens.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#030303] text-white font-sans selection:bg-[#FF7A00]/20">
      <EnterpriseHeader />

      <main className="flex-grow">
        <section className="border-b border-white/5 bg-gradient-to-b from-[#FF7A00]/10 to-transparent">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#FF7A00]">
              BhojanOS Marketplace
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Nearby kitchens &amp; restaurants
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/60 sm:text-base">
              Discover what delivers to you — sorted by distance, delivery time, and quality signals.
            </p>

            {view.locationLabel && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
                <MapPin className="h-3.5 w-3.5 text-[#FF7A00]" />
                {view.locationLabel}
              </div>
            )}

            {search.searchEnabled && (
              <div className="mt-6 max-w-2xl">
                <MarketplaceSearchBar
                  value={search.inputValue}
                  onChange={search.setInputValue}
                  onSubmit={() => void search.submitSearch()}
                  onClear={search.clearSearch}
                  disabled={search.view.status === 'loading'}
                  autocompleteView={search.autocompleteView}
                  autocompleteEnabled={search.autocompleteEnabled}
                  onAutocompleteFocus={search.onAutocompleteFocus}
                  onAutocompleteBlur={search.onAutocompleteBlur}
                  onAutocompleteKeyDown={search.onAutocompleteKeyDown}
                  onAutocompleteSelect={search.onAutocompleteSelect}
                />
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          {search.isSearchMode ? (
            <MarketplaceSearchResults
              view={search.view}
              onRetry={() => void search.retry()}
              onDetectLocation={() => void handleSearchDetect()}
              onManualSubmit={(address) => void handleSearchManual(address)}
              onFiltersChange={(filters) => void search.updateFilters(filters)}
              onSortChange={(sort) => void search.updateSort(sort)}
              onResetFilters={() => void search.resetFilters()}
              onResultClick={search.trackResultClick}
              detecting={searchDetecting}
              manualSubmitting={searchManualSubmitting}
            />
          ) : (
            <>
              {!showDiscoveryList && (
                <MarketplaceHomeStates
                  view={view}
                  onDetectLocation={handleDetect}
                  onRetry={() => void retry()}
                  onManualSubmit={(address) => void handleManual(address)}
                  detecting={detecting}
                  manualSubmitting={manualSubmitting}
                />
              )}

              {showDiscoveryList && (
                <>
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <p className="text-sm text-white/60">
                      {view.kitchens.length} nearby
                      {view.totalCandidates !== undefined && view.totalCandidates > view.kitchens.length
                        ? ` · ${view.totalCandidates} candidates`
                        : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => void refresh()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:border-[#FF7A00]/40"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Refresh
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {view.kitchens.map((kitchen) => (
                      <MarketplaceKitchenCardView key={kitchen.tenantId} kitchen={kitchen} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </main>

      <EnterpriseFooter />
    </div>
  );
};

export default MarketplaceHome;
