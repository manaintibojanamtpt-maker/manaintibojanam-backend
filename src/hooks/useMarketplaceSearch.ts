/**
 * M4 PR-7 / PR-8 — Marketplace search hook (session-driven, no duplicate SearchFacade calls).
 */

import { useCallback, useEffect, useState } from 'react';
import { useMarketplaceAutocomplete } from './useMarketplaceAutocomplete';
import { isSdkSuccess } from '../sdk/core/resultHelpers';
import { readCustomerLocationSession } from '../lib/customerLocation/CustomerLocationFacade';
import {
  applyMarketplaceSearchFilters,
  clearMarketplaceSearch,
  getMarketplaceSearchViewModel,
  isMarketplaceSearchEnabled,
  readMarketplaceSearchFilters,
  readMarketplaceSearchSort,
  resetMarketplaceSearchFilters,
  retryMarketplaceSearch,
  searchMarketplaceHome,
  subscribeMarketplaceSearch,
  trackMarketplaceSearchResultClick,
} from '../lib/marketplace/MarketplaceSearchFacade';
import {
  detectMarketplaceLocation,
  saveMarketplaceManualLocation,
} from '../lib/marketplace/MarketplaceHomeFacade';
import type {
  MarketplaceSearchFilterState,
  MarketplaceSearchSort,
} from '../lib/marketplace/searchFilterTypes';
import type { MarketplaceSearchViewModel } from '../lib/marketplace/searchTypes';

export function useMarketplaceSearch() {
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [filters, setFilters] = useState<MarketplaceSearchFilterState>(() =>
    readMarketplaceSearchFilters()
  );
  const [sort, setSort] = useState<MarketplaceSearchSort>(() => readMarketplaceSearchSort());
  const [view, setView] = useState<MarketplaceSearchViewModel>(() =>
    getMarketplaceSearchViewModel(null)
  );
  const searchEnabled = isMarketplaceSearchEnabled();

  useEffect(() => {
    if (!searchEnabled) {
      setView(getMarketplaceSearchViewModel(null));
      return;
    }

    const sync = () => setView(getMarketplaceSearchViewModel(submittedQuery));
    sync();
    return subscribeMarketplaceSearch(sync);
  }, [searchEnabled, submittedQuery, filters, sort]);

  const runSearch = useCallback(
    async (text: string) => {
      const outcome = await searchMarketplaceHome({ text, filters, sort });
      setView(outcome.view);
      setFilters(outcome.view.filters);
      setSort(outcome.view.sort);
      return outcome;
    },
    [filters, sort]
  );

  const submitSearch = useCallback(
    async (text?: string) => {
      const query = (text ?? inputValue).trim();
      if (!query) {
        return null;
      }

      setSubmittedQuery(query);
      setInputValue(query);
      return runSearch(query);
    },
    [inputValue, runSearch]
  );

  const clearSearch = useCallback(() => {
    clearMarketplaceSearch();
    setSubmittedQuery(null);
    setInputValue('');
    setView(getMarketplaceSearchViewModel(null));
  }, []);

  const updateFilters = useCallback(
    async (nextFilters: MarketplaceSearchFilterState) => {
      setFilters(nextFilters);
      if (!submittedQuery) {
        return applyMarketplaceSearchFilters({ filters: nextFilters, sort });
      }
      const outcome = await applyMarketplaceSearchFilters({
        filters: nextFilters,
        sort,
        query: submittedQuery,
      });
      if (outcome) {
        setView(outcome.view);
      }
      return outcome;
    },
    [sort, submittedQuery]
  );

  const updateSort = useCallback(
    async (nextSort: MarketplaceSearchSort) => {
      setSort(nextSort);
      if (!submittedQuery) {
        return applyMarketplaceSearchFilters({ filters, sort: nextSort });
      }
      const outcome = await applyMarketplaceSearchFilters({
        filters,
        sort: nextSort,
        query: submittedQuery,
      });
      if (outcome) {
        setView(outcome.view);
      }
      return outcome;
    },
    [filters, submittedQuery]
  );

  const resetFilters = useCallback(async () => {
    resetMarketplaceSearchFilters();
    const nextFilters = readMarketplaceSearchFilters();
    const nextSort = readMarketplaceSearchSort();
    setFilters(nextFilters);
    setSort(nextSort);
    if (submittedQuery) {
      const outcome = await applyMarketplaceSearchFilters({
        filters: nextFilters,
        sort: nextSort,
        query: submittedQuery,
      });
      if (outcome) {
        setView(outcome.view);
      }
      return outcome;
    }
    return null;
  }, [submittedQuery]);

  const retry = useCallback(async () => {
    const outcome = await retryMarketplaceSearch();
    setView(outcome.view);
    return outcome;
  }, []);

  const retryWithLocationDetection = useCallback(async () => {
    const result = await detectMarketplaceLocation({ enableHighAccuracy: true, timeoutMs: 12_000 });
    if (!isSdkSuccess(result)) {
      setView((current) => ({
        ...current,
        status: result.error.code === 'FORBIDDEN' ? 'location_denied' : 'location_unavailable',
        error: {
          code: result.error.code,
          message: result.error.message,
          userMessage:
            result.error.code === 'FORBIDDEN'
              ? 'Location permission was denied.'
              : 'Could not detect your location.',
          retryable: result.error.code === 'UNAVAILABLE',
        },
        retryable: result.error.code === 'UNAVAILABLE',
      }));
      return result;
    }

    if (submittedQuery) {
      return runSearch(submittedQuery);
    }

    setView(getMarketplaceSearchViewModel(submittedQuery));
    return result;
  }, [runSearch, submittedQuery]);

  const setManualLocationAndSearch = useCallback(
    async (address: string) => {
      const result = await saveMarketplaceManualLocation(address);
      if (!isSdkSuccess(result)) {
        setView((current) => ({
          ...current,
          status: 'location_unavailable',
          error: {
            code: result.error.code,
            message: result.error.message,
            userMessage: 'Could not find that address. Try a more specific search.',
            retryable: true,
          },
          retryable: true,
        }));
        return result;
      }

      const query = submittedQuery ?? inputValue.trim();
      if (query) {
        setSubmittedQuery(query);
        return runSearch(query);
      }

      setView(getMarketplaceSearchViewModel(submittedQuery));
      return result;
    },
    [inputValue, runSearch, submittedQuery]
  );

  const selectRecentSearch = useCallback(
    async (query: string) => {
      setInputValue(query);
      return submitSearch(query);
    },
    [submitSearch]
  );

  const trackResultClick = useCallback(
    (tenantId: string) => {
      trackMarketplaceSearchResultClick({
        tenantId,
        query: view.query,
        correlationId: view.correlationId,
      });
    },
    [view.correlationId, view.query]
  );

  const isSearchMode = submittedQuery !== null;

  const autocomplete = useMarketplaceAutocomplete({
    inputValue,
    enabled: searchEnabled && !isSearchMode,
    onSelectQuery: async (query: string) => {
      await selectRecentSearch(query);
    },
  });

  return {
    view,
    searchEnabled,
    inputValue,
    setInputValue,
    submittedQuery,
    filters,
    sort,
    isSearchMode,
    submitSearch,
    clearSearch,
    updateFilters,
    updateSort,
    resetFilters,
    retry,
    retryWithLocationDetection,
    setManualLocationAndSearch,
    selectRecentSearch,
    trackResultClick,
    hasCustomerLocation: Boolean(readCustomerLocationSession()),
    autocompleteView: autocomplete.view,
    autocompleteEnabled: autocomplete.autocompleteEnabled,
    onAutocompleteFocus: () => autocomplete.setFocused(true),
    onAutocompleteBlur: () => {
      window.setTimeout(() => autocomplete.setFocused(false), 120);
    },
    onAutocompleteKeyDown: autocomplete.handleKeyDown,
    onAutocompleteSelect: (item) => void autocomplete.selectItem(item),
  };
}
