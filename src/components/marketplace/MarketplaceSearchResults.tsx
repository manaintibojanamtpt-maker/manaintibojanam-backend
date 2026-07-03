import React from 'react';
import { MarketplaceSearchResultCardView } from './MarketplaceSearchResultCard';
import { MarketplaceSearchStates } from './MarketplaceSearchStates';
import { MarketplaceSearchFilterChips } from './MarketplaceSearchFilterChips';
import { MarketplaceSearchFilterDrawer } from './MarketplaceSearchFilterDrawer';
import { MarketplaceSearchSortSelector } from './MarketplaceSearchSortSelector';
import type { MarketplaceSearchViewModel } from '../../lib/marketplace/searchTypes';
import type {
  MarketplaceSearchFilterState,
  MarketplaceSearchSort,
} from '../../lib/marketplace/searchFilterTypes';

interface MarketplaceSearchResultsProps {
  readonly view: MarketplaceSearchViewModel;
  readonly onRetry: () => void;
  readonly onDetectLocation: () => void;
  readonly onManualSubmit: (address: string) => void;
  readonly onFiltersChange: (filters: MarketplaceSearchFilterState) => void;
  readonly onSortChange: (sort: MarketplaceSearchSort) => void;
  readonly onResetFilters: () => void;
  readonly onResultClick: (tenantId: string) => void;
  readonly detecting?: boolean;
  readonly manualSubmitting?: boolean;
}

export const MarketplaceSearchResults: React.FC<MarketplaceSearchResultsProps> = ({
  view,
  onRetry,
  onDetectLocation,
  onManualSubmit,
  onFiltersChange,
  onSortChange,
  onResetFilters,
  onResultClick,
  detecting,
  manualSubmitting,
}) => {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const showList = view.status === 'success' && view.results.length > 0;

  return (
    <>
      <div className="mb-5 space-y-3">
        <MarketplaceSearchFilterChips
          filters={view.filters}
          activeFilterCount={view.activeFilterCount}
          onToggleOpenNow={() =>
            onFiltersChange({ ...view.filters, openNow: !view.filters.openNow })
          }
          onToggleVegOnly={() =>
            onFiltersChange({ ...view.filters, vegOnly: !view.filters.vegOnly })
          }
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        <MarketplaceSearchSortSelector
          value={view.sort}
          onChange={onSortChange}
          disabled={view.status === 'loading'}
        />
      </div>

      {!showList ? (
        <MarketplaceSearchStates
          view={view}
          onRetry={onRetry}
          onDetectLocation={onDetectLocation}
          onManualSubmit={onManualSubmit}
          detecting={detecting}
          manualSubmitting={manualSubmitting}
        />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-white/60">
              {view.results.length} result{view.results.length === 1 ? '' : 's'}
              {view.totalDiscoveryCandidates !== undefined && view.totalDiscoveryCandidates > 0
                ? ` · ${view.totalDiscoveryCandidates} nearby candidates`
                : ''}
            </p>
            {view.correlationId && (
              <p className="text-[10px] text-white/30">Ref {view.correlationId.slice(-8)}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {view.results.map((result) => (
              <MarketplaceSearchResultCardView
                key={result.tenantId}
                result={result}
                query={view.query}
                onResultClick={onResultClick}
              />
            ))}
          </div>
        </>
      )}

      <MarketplaceSearchFilterDrawer
        open={drawerOpen}
        filters={view.filters}
        onClose={() => setDrawerOpen(false)}
        onApply={onFiltersChange}
        onReset={() => {
          onResetFilters();
          setDrawerOpen(false);
        }}
      />
    </>
  );
};

export default MarketplaceSearchResults;
