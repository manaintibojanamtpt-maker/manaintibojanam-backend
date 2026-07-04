import { create } from 'zustand';
import type { DiscoveryFilters } from '@/types/marketplace-discovery';
import { DEFAULT_DISCOVERY_FILTERS } from '../domain/filters';

interface DiscoveryFilterState {
  readonly filters: DiscoveryFilters;
  setFilters: (patch: Partial<DiscoveryFilters>) => void;
  resetFilters: () => void;
}

export const useDiscoveryFilterStore = create<DiscoveryFilterState>((set) => ({
  filters: DEFAULT_DISCOVERY_FILTERS,
  setFilters: (patch) =>
    set((state) => ({
      filters: { ...state.filters, ...patch },
    })),
  resetFilters: () => set({ filters: DEFAULT_DISCOVERY_FILTERS }),
}));
