import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SearchFilters } from '@/types/marketplace-search';
import { DEFAULT_SEARCH_FILTERS } from '../domain/filters';

interface SearchFilterState {
  readonly filters: SearchFilters;
  setFilters: (patch: Partial<SearchFilters>) => void;
  resetFilters: () => void;
}

export const useSearchFilterStore = create<SearchFilterState>((set) => ({
  filters: DEFAULT_SEARCH_FILTERS,
  setFilters: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),
  resetFilters: () => set({ filters: DEFAULT_SEARCH_FILTERS }),
}));

interface SearchHistoryState {
  readonly terms: readonly { id: string; label: string; searchedAt: string }[];
  addTerm: (label: string) => void;
  removeTerm: (id: string) => void;
  clearAll: () => void;
}

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set, get) => ({
      terms: [],
      addTerm: (label) => {
        const trimmed = label.trim();
        if (!trimmed) return;
        const id = `local_${Date.now()}`;
        const existing = get().terms.filter(
          (t) => t.label.toLowerCase() !== trimmed.toLowerCase(),
        );
        set({
          terms: [{ id, label: trimmed, searchedAt: new Date().toISOString() }, ...existing].slice(
            0,
            12,
          ),
        });
      },
      removeTerm: (id) => set({ terms: get().terms.filter((t) => t.id !== id) }),
      clearAll: () => set({ terms: [] }),
    }),
    { name: 'ob-search-history-m4' },
  ),
);

interface SearchSessionState {
  readonly query: string;
  readonly isFocused: boolean;
  setQuery: (query: string) => void;
  setFocused: (focused: boolean) => void;
  resetSession: () => void;
}

export const useSearchSessionStore = create<SearchSessionState>((set) => ({
  query: '',
  isFocused: false,
  setQuery: (query) => set({ query }),
  setFocused: (isFocused) => set({ isFocused }),
  resetSession: () => set({ query: '', isFocused: false }),
}));
