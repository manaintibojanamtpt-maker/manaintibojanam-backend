/**
 * M4 PR-9 — Marketplace autocomplete hook (debounce, cancellation, keyboard state).
 */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { AutocompleteItem, MarketplaceAutocompleteViewModel } from '../lib/marketplace/autocompleteTypes';
import {
  buildIdleAutocompleteView,
  flattenAutocompleteItems,
  isMarketplaceAutocompleteEnabled,
  loadMarketplaceAutocomplete,
  trackAutocompleteItemSelected,
  trackAutocompletePanelOpened,
} from '../lib/marketplace/MarketplaceAutocompleteFacade';

const AUTOCOMPLETE_DEBOUNCE_MS = 300;

export interface UseMarketplaceAutocompleteOptions {
  readonly inputValue: string;
  readonly enabled?: boolean;
  readonly onSelectQuery: (query: string) => void | Promise<void>;
}

export function useMarketplaceAutocomplete({
  inputValue,
  enabled = true,
  onSelectQuery,
}: UseMarketplaceAutocompleteOptions) {
  const [focused, setFocused] = useState(false);
  const [view, setView] = useState<MarketplaceAutocompleteViewModel>(() =>
    buildIdleAutocompleteView()
  );
  const [activeIndex, setActiveIndex] = useState(-1);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedTrackedRef = useRef(false);

  const autocompleteEnabled = enabled && isMarketplaceAutocompleteEnabled();
  const panelOpen = focused && autocompleteEnabled;

  const refresh = useCallback(
    async (prefix: string, open: boolean) => {
      const requestId = ++requestIdRef.current;

      if (!open) {
        setView(buildIdleAutocompleteView());
        setActiveIndex(-1);
        openedTrackedRef.current = false;
        return;
      }

      setView((current) => ({
        ...current,
        status: 'loading',
        open: true,
        prefix,
      }));

      const nextView = await loadMarketplaceAutocomplete({ prefix, panelOpen: true });
      if (requestId !== requestIdRef.current) {
        return;
      }

      setView(nextView);
      setActiveIndex(-1);

      if (!openedTrackedRef.current) {
        trackAutocompletePanelOpened(prefix);
        openedTrackedRef.current = true;
      }
    },
    []
  );

  useEffect(() => {
    if (!panelOpen) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      void refresh(inputValue, false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void refresh(inputValue, true);
    }, AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputValue, panelOpen, refresh]);

  const flatItems = flattenAutocompleteItems(view.sections);

  const selectItem = useCallback(
    async (item: AutocompleteItem) => {
      trackAutocompleteItemSelected(item, inputValue.trim());
      setFocused(false);
      setActiveIndex(-1);
      await onSelectQuery(item.label);
    },
    [inputValue, onSelectQuery]
  );

  const moveActiveIndex = useCallback(
    (delta: number) => {
      if (flatItems.length === 0) {
        setActiveIndex(-1);
        return;
      }

      setActiveIndex((current) => {
        const next = current + delta;
        if (next < 0) {
          return flatItems.length - 1;
        }
        if (next >= flatItems.length) {
          return 0;
        }
        return next;
      });
    },
    [flatItems.length]
  );

  const selectActiveItem = useCallback(() => {
    if (activeIndex < 0 || activeIndex >= flatItems.length) {
      return false;
    }

    void selectItem(flatItems[activeIndex]!);
    return true;
  }, [activeIndex, flatItems, selectItem]);

  const closePanel = useCallback(() => {
    requestIdRef.current += 1;
    setFocused(false);
    setActiveIndex(-1);
    setView(buildIdleAutocompleteView());
    openedTrackedRef.current = false;
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!panelOpen) {
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          moveActiveIndex(1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          moveActiveIndex(-1);
          break;
        case 'Enter':
          if (activeIndex >= 0 && selectActiveItem()) {
            event.preventDefault();
          }
          break;
        case 'Escape':
          event.preventDefault();
          closePanel();
          break;
        default:
          break;
      }
    },
    [activeIndex, closePanel, moveActiveIndex, panelOpen, selectActiveItem]
  );

  return {
    view: { ...view, activeIndex },
    autocompleteEnabled,
    panelOpen,
    focused,
    setFocused,
    flatItems,
    activeIndex,
    selectItem,
    closePanel,
    handleKeyDown,
  };
}
