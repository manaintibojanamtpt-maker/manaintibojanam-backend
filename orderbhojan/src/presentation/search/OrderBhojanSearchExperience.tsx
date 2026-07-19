import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { Section } from '@bhojan/storefront-design-system/primitives/Section';
import { useSearchBrowse } from '@/features/search/hooks/useSearchBrowse';
import { useMenuItemSearch } from '@/features/search/hooks/useMenuItemSearch';
import { useSearchHistoryStore, useSearchSessionStore } from '@/features/search/store/searchStore';
import {
  OrderBhojanDiscoveryOfflineNotice,
  OrderBhojanDiscoveryUxState,
  useOnlineStatus,
} from '@/presentation/states';
import { OrderBhojanSearchBar } from './OrderBhojanSearchBar';
import { OrderBhojanSearchFiltersBar } from './OrderBhojanSearchFiltersBar';
import { OrderBhojanSearchBrowsePanel } from './OrderBhojanSearchBrowsePanel';
import { OrderBhojanSearchResultsSection } from './OrderBhojanSearchResultsSection';
import { OrderBhojanSearchResultsSkeleton } from './OrderBhojanSearchResultsSkeleton';

export function OrderBhojanSearchExperience() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = useSearchSessionStore((s) => s.query);
  const setQuery = useSearchSessionStore((s) => s.setQuery);
  const addTerm = useSearchHistoryStore((s) => s.addTerm);
  const online = useOnlineStatus();

  const browseQuery = useSearchBrowse();
  const menuSearchQuery = useMenuItemSearch(query);

  const trimmed = query.trim();
  const isSearching = trimmed.length > 0;
  const fieldRef = useRef<HTMLDivElement>(null);

  const menuResultsSection = useMemo(() => {
    const items = menuSearchQuery.data?.items ?? [];
    if (items.length === 0) return null;
    return {
      id: 'menu-items',
      title: 'Menu items',
      type: 'food' as const,
      items,
      total: menuSearchQuery.data?.meta.totalResults ?? items.length,
    };
  }, [menuSearchQuery.data?.items, menuSearchQuery.data?.meta.totalResults]);

  useEffect(() => {
    const initial = searchParams.get('q')?.trim();
    if (initial) {
      setQuery(initial);
    }
    fieldRef.current?.querySelector('input')?.focus();
  }, [searchParams, setQuery]);

  const selectTerm = (label: string) => {
    setQuery(label);
    addTerm(label);
    fieldRef.current?.querySelector('input')?.focus();
  };

  const handleSubmit = () => {
    if (!trimmed) return;
    addTerm(trimmed);
    void menuSearchQuery.refetch();
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      <Section density="hero" background="gradient" className="!pb-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <SoftButton type="button" tone="ghost" size="compact" onClick={() => navigate(-1)} aria-label="Go back">
            ← Back
          </SoftButton>
        </div>
        <h1 className="sr-only">Search OrderBhojan</h1>
        <OrderBhojanSearchBar onSubmit={handleSubmit} onSelectTerm={selectTerm} inputRef={fieldRef} />
      </Section>

      <div className="mx-auto max-w-5xl px-4 pb-[var(--ob-chrome-bottom)] sm:px-6 lg:px-8">
        {!online ? (
          <div className="py-6">
            <OrderBhojanDiscoveryOfflineNotice
              onRetry={() => {
                if (isSearching) void menuSearchQuery.refetch();
                else void browseQuery.refetch();
              }}
            />
          </div>
        ) : null}

        {isSearching ? (
          <div className="space-y-6 py-6">
            <OrderBhojanSearchFiltersBar />
            {menuSearchQuery.isFetching && !menuSearchQuery.data && !menuResultsSection ? (
              <OrderBhojanSearchResultsSkeleton />
            ) : null}
            {menuSearchQuery.isError ? (
              <OrderBhojanDiscoveryUxState
                variant="error"
                title="Search unavailable"
                description="Please check your connection and try again."
                primaryLabel="Retry"
                onPrimary={() => void menuSearchQuery.refetch()}
              />
            ) : null}
            {menuSearchQuery.data && menuSearchQuery.data.meta.totalResults === 0 ? (
              <OrderBhojanDiscoveryUxState
                variant="no-results"
                title={`No results for "${trimmed}"`}
                description="Try a different spelling or browse popular searches below."
                primaryLabel="Clear search"
                onPrimary={() => setQuery('')}
              />
            ) : null}
            {menuResultsSection ? (
              <OrderBhojanSearchResultsSection
                key={menuResultsSection.id}
                section={menuResultsSection}
                query={trimmed}
                onSelectTerm={selectTerm}
              />
            ) : null}
          </div>
        ) : browseQuery.isError ? (
          <div className="py-6">
            <OrderBhojanDiscoveryUxState
              variant="error"
              title="Could not load browse suggestions"
              description="Please check your connection and try again."
              primaryLabel="Retry"
              onPrimary={() => void browseQuery.refetch()}
            />
          </div>
        ) : (
          <OrderBhojanSearchBrowsePanel
            trending={browseQuery.data?.trending.trending ?? []}
            popular={browseQuery.data?.trending.popular ?? []}
            apiRecent={browseQuery.data?.recent.recent ?? []}
            collections={browseQuery.data?.collections.sections ?? []}
            isLoading={browseQuery.isLoading}
            onSelectTerm={selectTerm}
          />
        )}
      </div>
    </div>
  );
}
