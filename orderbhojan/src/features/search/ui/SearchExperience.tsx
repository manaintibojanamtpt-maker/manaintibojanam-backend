import { useEffect, useRef } from 'react';
import { Button, MotionPage, PremiumSearch, Text } from '@bhojan/design-system';
import { useNavigate } from 'react-router-dom';
import { useSearchBrowse } from '../hooks/useSearchBrowse';
import { useSearchResults } from '../hooks/useSearchResults';
import { useSearchSuggestions } from '../hooks/useSearchSuggestions';
import { useSearchHistoryStore, useSearchSessionStore } from '../store/searchStore';
import { SearchBrowsePanel } from './SearchBrowsePanel';
import { SearchFiltersBar } from './SearchFiltersBar';
import { SearchResultsSection } from './SearchResultsSection';
import { SearchResultsSkeleton } from './SearchResultRow';
import { trackSearchEvent } from '../analytics/searchAnalytics';

export function SearchExperience() {
  const navigate = useNavigate();
  const query = useSearchSessionStore((s) => s.query);
  const isFocused = useSearchSessionStore((s) => s.isFocused);
  const setQuery = useSearchSessionStore((s) => s.setQuery);
  const setFocused = useSearchSessionStore((s) => s.setFocused);
  const addTerm = useSearchHistoryStore((s) => s.addTerm);

  const browseQuery = useSearchBrowse();
  const resultsQuery = useSearchResults(query);
  const suggestionsQuery = useSearchSuggestions(query);

  const trimmed = query.trim();
  const isSearching = trimmed.length > 0;
  const showSuggestions =
    isSearching &&
    isFocused &&
    (suggestionsQuery.data?.suggestions.length ?? 0) > 0 &&
    !resultsQuery.isFetching;

  const fieldRef = useRef<HTMLDivElement>(null);

  const focusInput = () => {
    fieldRef.current?.querySelector('input')?.focus();
  };

  useEffect(() => {
    focusInput();
  }, []);

  const selectTerm = (label: string) => {
    setQuery(label);
    addTerm(label);
    focusInput();
  };

  const handleSubmit = () => {
    if (!trimmed) return;
    addTerm(trimmed);
    void resultsQuery.refetch();
  };

  return (
    <MotionPage className="ob-search-px2">
      <Text variant="caption" className="bds-sr-only" as="h1">
        Search OrderBhojan
      </Text>

      <div ref={fieldRef}>
        <PremiumSearch
          variant="sticky"
          value={query}
          placeholder="Search food, restaurants, cuisines..."
          aria-label="Search marketplace"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSubmit();
            }
            if (event.key === 'Escape') {
              setQuery('');
              trackSearchEvent('search_clear');
            }
          }}
          onClear={
            trimmed
              ? () => {
                  setQuery('');
                  trackSearchEvent('search_clear');
                  focusInput();
                }
              : undefined
          }
        />
      </div>

      {showSuggestions ? (
        <div className="ob-search-suggestions" role="listbox" aria-label="Search suggestions">
          {suggestionsQuery.data?.suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className="ob-search-suggestions__item"
              role="option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectTerm(suggestion.label)}
            >
              <Text variant="bodySm">{suggestion.label}</Text>
              <Text variant="caption">{suggestion.type}</Text>
            </button>
          ))}
        </div>
      ) : null}

      <main className="ob-search-platform__body">
        {isSearching ? (
          <>
            <SearchFiltersBar />
            {resultsQuery.isLoading ? <SearchResultsSkeleton /> : null}
            {resultsQuery.isError ? (
              <section className="ob-search-empty" role="alert">
                <Text variant="subtitle" as="h2">
                  Search unavailable
                </Text>
                <Text variant="body" style={{ color: 'var(--bds-color-text-secondary)' }}>
                  Please check your connection and try again.
                </Text>
                <Button variant="primary" onClick={() => void resultsQuery.refetch()}>
                  Retry
                </Button>
              </section>
            ) : null}
            {resultsQuery.data && resultsQuery.data.meta.totalResults === 0 ? (
              <section className="ob-search-empty">
                <Text variant="subtitle" as="h2">
                  No results for &ldquo;{trimmed}&rdquo;
                </Text>
                <Text variant="body" style={{ color: 'var(--bds-color-text-secondary)' }}>
                  Try a different spelling or browse popular searches below.
                </Text>
              </section>
            ) : null}
            {resultsQuery.data?.sections.map((section) => (
              <SearchResultsSection
                key={section.id}
                section={section}
                query={trimmed}
                onSelectTerm={selectTerm}
              />
            ))}
          </>
        ) : (
          <SearchBrowsePanel
            trending={browseQuery.data?.trending.trending ?? []}
            popular={browseQuery.data?.trending.popular ?? []}
            apiRecent={browseQuery.data?.recent.recent ?? []}
            collections={browseQuery.data?.collections.sections ?? []}
            isLoading={browseQuery.isLoading}
            onSelectTerm={selectTerm}
          />
        )}
      </main>

      <Button variant="ghost" size="compact" onClick={() => navigate(-1)} aria-label="Go back">
        ← Back
      </Button>
    </MotionPage>
  );
}
