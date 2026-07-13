import { useMemo, useState } from 'react';
import { MarketplaceSearchBar } from '@bhojan/storefront-design-system/marketplace/MarketplaceSearchBar';
import type { AutocompleteItem } from '@bhojan/storefront-design-system/marketplace/types';
import { useSearchSuggestions } from '@/features/search/hooks/useSearchSuggestions';
import { useSearchSessionStore } from '@/features/search/store/searchStore';
import { trackSearchEvent } from '@/features/search/analytics/searchAnalytics';
import {
  flattenAutocompleteItems,
  mapSearchSuggestionsToAutocompleteView,
} from './mapSearchSuggestionsToAutocompleteView';

export interface OrderBhojanSearchBarProps {
  readonly onSubmit: () => void;
  readonly onSelectTerm: (label: string) => void;
  readonly inputRef?: React.RefObject<HTMLDivElement | null>;
}

export function OrderBhojanSearchBar({ onSubmit, onSelectTerm, inputRef }: OrderBhojanSearchBarProps) {
  const query = useSearchSessionStore((s) => s.query);
  const isFocused = useSearchSessionStore((s) => s.isFocused);
  const setQuery = useSearchSessionStore((s) => s.setQuery);
  const setFocused = useSearchSessionStore((s) => s.setFocused);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestionsQuery = useSearchSuggestions(query);
  const trimmed = query.trim();
  const showAutocomplete = trimmed.length > 0 && isFocused;

  const autocompleteView = useMemo(
    () =>
      mapSearchSuggestionsToAutocompleteView({
        suggestions: suggestionsQuery.data?.suggestions,
        query,
        isFocused: showAutocomplete,
        isFetching: suggestionsQuery.isFetching,
        isError: suggestionsQuery.isError,
        activeIndex,
      }),
    [
      suggestionsQuery.data?.suggestions,
      suggestionsQuery.isFetching,
      suggestionsQuery.isError,
      query,
      showAutocomplete,
      activeIndex,
    ],
  );

  const flatItems = useMemo(() => flattenAutocompleteItems(autocompleteView), [autocompleteView]);

  const handleSelect = (item: AutocompleteItem) => {
    onSelectTerm(item.label);
    setActiveIndex(-1);
  };

  return (
    <div
      ref={inputRef}
      className="sticky z-40 -mx-4 border-b border-white/5 bg-[#030303]/95 px-4 py-4 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <MarketplaceSearchBar
        value={query}
        onChange={(value) => {
          setQuery(value);
          setActiveIndex(-1);
        }}
        onSubmit={onSubmit}
        onClear={() => {
          setQuery('');
          trackSearchEvent('search_clear');
          setActiveIndex(-1);
        }}
        disabled={false}
        autocompleteView={autocompleteView}
        autocompleteEnabled={showAutocomplete}
        onAutocompleteFocus={() => setFocused(true)}
        onAutocompleteBlur={() => setFocused(false)}
        onAutocompleteSelect={handleSelect}
        onAutocompleteKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (flatItems.length === 0) return;
            setActiveIndex((current) => (current + 1) % flatItems.length);
            return;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (flatItems.length === 0) return;
            setActiveIndex((current) => (current <= 0 ? flatItems.length - 1 : current - 1));
            return;
          }
          if (event.key === 'Enter' && activeIndex >= 0 && flatItems[activeIndex]) {
            event.preventDefault();
            handleSelect(flatItems[activeIndex]);
            return;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setQuery('');
            setActiveIndex(-1);
            trackSearchEvent('search_clear');
          }
        }}
      />
    </div>
  );
}
