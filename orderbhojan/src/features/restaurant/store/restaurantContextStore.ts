import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RestaurantContextState {
  readonly restaurantId: string | null;
  readonly contextToken: string | null;
  readonly restaurantSlug: string | null;
  setContext: (ctx: {
    readonly restaurantId: string;
    readonly contextToken: string;
    readonly restaurantSlug: string;
  }) => void;
  clear: () => void;
}

export const useRestaurantContextStore = create<RestaurantContextState>()(
  persist(
    (set) => ({
      restaurantId: null,
      contextToken: null,
      restaurantSlug: null,

      setContext: (ctx) => set({ ...ctx }),

      clear: () =>
        set({
          restaurantId: null,
          contextToken: null,
          restaurantSlug: null,
        }),
    }),
    {
      name: 'ob-restaurant-context-m7',
      partialize: (state) => ({
        restaurantId: state.restaurantId,
        contextToken: state.contextToken,
        restaurantSlug: state.restaurantSlug,
      }),
    },
  ),
);

export function fallbackRestaurantId(slug: string): string {
  return `rest_${slug.replace(/-/g, '_')}`;
}
