import React from 'react';
import { ChefHat, Clock, Flame, History, Loader2, MapPin, Search, UtensilsCrossed } from 'lucide-react';
import type { AutocompleteItem, AutocompleteSection, MarketplaceAutocompleteViewModel } from '../../lib/marketplace/autocompleteTypes';

interface MarketplaceSearchAutocompleteProps {
  readonly view: MarketplaceAutocompleteViewModel;
  readonly onSelect: (item: AutocompleteItem) => void;
}

const sectionIcon = (sectionId: string): React.ReactNode => {
  if (sectionId.includes('recent')) {
    return <History className="h-3.5 w-3.5 text-white/40" />;
  }
  if (sectionId.includes('popular')) {
    return <UtensilsCrossed className="h-3.5 w-3.5 text-white/40" />;
  }
  if (sectionId.includes('nearby')) {
    return <MapPin className="h-3.5 w-3.5 text-white/40" />;
  }
  if (sectionId.includes('trending')) {
    return <Flame className="h-3.5 w-3.5 text-white/40" />;
  }
  return <ChefHat className="h-3.5 w-3.5 text-white/40" />;
};

const itemIcon = (item: AutocompleteItem): React.ReactNode => {
  if (item.source === 'recent') {
    return <Clock className="h-3.5 w-3.5 text-white/40" />;
  }
  if (item.kind === 'restaurant') {
    return <ChefHat className="h-3.5 w-3.5 text-white/40" />;
  }
  return <Search className="h-3.5 w-3.5 text-white/40" />;
};

const listboxId = 'marketplace-search-autocomplete-listbox';

export const MarketplaceSearchAutocomplete: React.FC<MarketplaceSearchAutocompleteProps> = ({
  view,
  onSelect,
}) => {
  if (!view.open) {
    return null;
  }

  let itemOffset = 0;

  const renderSection = (section: AutocompleteSection) => {
    const sectionNode = (
      <li key={section.id} role="presentation">
        <p className="border-b border-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {section.title}
        </p>
        <ul role="group" aria-label={section.title}>
          {section.items.map((item) => {
            const index = itemOffset;
            itemOffset += 1;
            const active = view.activeIndex === index;

            return (
              <li key={item.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  id={`${listboxId}-option-${index}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSelect(item)}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${
                    active ? 'bg-[#FF7A00]/15 text-white' : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  {itemIcon(item)}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {sectionIcon(section.id)}
                </button>
              </li>
            );
          })}
        </ul>
      </li>
    );

    return sectionNode;
  };

  return (
    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-white/10 bg-[#111] shadow-xl">
      {view.status === 'loading' && (
        <div className="flex items-center gap-2 px-3 py-3 text-sm text-white/60">
          <Loader2 className="h-4 w-4 animate-spin text-[#FF7A00]" aria-hidden="true" />
          Loading suggestions…
        </div>
      )}

      {view.status === 'error' && view.error && (
        <div className="border-b border-white/5 px-3 py-2 text-xs text-amber-300/90" role="alert">
          {view.error.userMessage}
        </div>
      )}

      {view.status === 'empty' && (
        <div className="px-3 py-4 text-sm text-white/50">No suggestions yet. Try a different term.</div>
      )}

      {(view.status === 'ready' || view.status === 'error' || view.status === 'loading') &&
        view.sections.length > 0 && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Search suggestions"
            className="max-h-80 overflow-y-auto"
          >
            {view.sections.map(renderSection)}
          </ul>
        )}
    </div>
  );
};

export default MarketplaceSearchAutocomplete;
