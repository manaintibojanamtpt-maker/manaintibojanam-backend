import React from 'react';
import { Search, X } from 'lucide-react';
import { MarketplaceSearchAutocomplete } from './MarketplaceSearchAutocomplete';
import type { AutocompleteItem, MarketplaceAutocompleteViewModel } from '../../lib/marketplace/autocompleteTypes';

interface MarketplaceSearchBarProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly onClear: () => void;
  readonly disabled?: boolean;
  readonly autocompleteView?: MarketplaceAutocompleteViewModel;
  readonly autocompleteEnabled?: boolean;
  readonly onAutocompleteFocus?: () => void;
  readonly onAutocompleteBlur?: () => void;
  readonly onAutocompleteKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  readonly onAutocompleteSelect?: (item: AutocompleteItem) => void;
}

export const MarketplaceSearchBar: React.FC<MarketplaceSearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  onClear,
  disabled = false,
  autocompleteView,
  autocompleteEnabled = false,
  onAutocompleteFocus,
  onAutocompleteBlur,
  onAutocompleteKeyDown,
  onAutocompleteSelect,
}) => {
  const showAutocomplete =
    autocompleteEnabled && autocompleteView?.open && onAutocompleteSelect !== undefined;

  const activeDescendant =
    showAutocomplete && autocompleteView && autocompleteView.activeIndex >= 0
      ? `marketplace-search-autocomplete-listbox-option-${autocompleteView.activeIndex}`
      : undefined;

  return (
    <div className="relative">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onFocus={onAutocompleteFocus}
            onBlur={onAutocompleteBlur}
            onKeyDown={onAutocompleteKeyDown}
            placeholder="Search restaurants, cuisines, or areas"
            disabled={disabled}
            className="w-full rounded-2xl border border-white/10 bg-black/50 py-3 pl-10 pr-10 text-sm text-[#fff8f0] placeholder:text-white/40 focus:border-[#e85d04] focus:outline-none disabled:opacity-60"
            aria-label="Search restaurants"
            aria-expanded={showAutocomplete}
            aria-controls={showAutocomplete ? 'marketplace-search-autocomplete-listbox' : undefined}
            aria-activedescendant={activeDescendant}
            aria-autocomplete="list"
            role="combobox"
            autoComplete="off"
          />
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-white/50 hover:bg-white/10 hover:text-white touch-manipulation"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="shrink-0 rounded-2xl bg-[#e85d04] px-5 py-3 text-sm font-semibold text-[#fff8f0] transition hover:bg-[#f07020] disabled:opacity-50"
        >
          Search
        </button>
      </form>

      {showAutocomplete && autocompleteView && (
        <MarketplaceSearchAutocomplete view={autocompleteView} onSelect={onAutocompleteSelect} />
      )}
    </div>
  );
};

export default MarketplaceSearchBar;
