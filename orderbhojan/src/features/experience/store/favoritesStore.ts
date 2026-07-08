import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  readonly ids: readonly string[];
  setIds: (ids: readonly string[]) => void;
  toggle: (restaurantId: string) => void;
  isFavorite: (restaurantId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      setIds: (ids) => set({ ids }),
      toggle: (restaurantId) => {
        const current = get().ids;
        set({
          ids: current.includes(restaurantId)
            ? current.filter((id) => id !== restaurantId)
            : [...current, restaurantId],
        });
      },
      isFavorite: (restaurantId) => get().ids.includes(restaurantId),
    }),
    { name: 'ob-favorites-m15' },
  ),
);
