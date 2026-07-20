import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PublicPromoCoupon, RestaurantOffer } from '@/types/marketplace-restaurant';

interface RestaurantContextState {
  readonly restaurantId: string | null;
  readonly contextToken: string | null;
  readonly restaurantSlug: string | null;
  readonly availableOffers: readonly RestaurantOffer[];
  readonly availablePromoCodes: readonly PublicPromoCoupon[];
  readonly appliedCouponCode: string | null;
  setContext: (ctx: {
    readonly restaurantId: string;
    readonly contextToken: string;
    readonly restaurantSlug: string;
  }) => void;
  setPromoContext: (ctx: {
    readonly offers?: readonly RestaurantOffer[];
    readonly promoCodes?: readonly PublicPromoCoupon[];
  }) => void;
  setAppliedCouponCode: (code: string | null) => void;
  clear: () => void;
}

export const useRestaurantContextStore = create<RestaurantContextState>()(
  persist(
    (set) => ({
      restaurantId: null,
      contextToken: null,
      restaurantSlug: null,
      availableOffers: [],
      availablePromoCodes: [],
      appliedCouponCode: null,

      setContext: (ctx) =>
        set((state) => {
          const restaurantChanged =
            state.restaurantSlug !== ctx.restaurantSlug ||
            state.restaurantId !== ctx.restaurantId;
          return restaurantChanged
            ? {
                ...ctx,
                availableOffers: [],
                availablePromoCodes: [],
                appliedCouponCode: null,
              }
            : { ...ctx };
        }),

      setPromoContext: (ctx) =>
        set({
          availableOffers: ctx.offers ?? [],
          availablePromoCodes: ctx.promoCodes ?? [],
        }),

      setAppliedCouponCode: (code) =>
        set({ appliedCouponCode: code?.trim().toUpperCase() || null }),

      clear: () =>
        set({
          restaurantId: null,
          contextToken: null,
          restaurantSlug: null,
          availableOffers: [],
          availablePromoCodes: [],
          appliedCouponCode: null,
        }),
    }),
    {
      name: 'ob-restaurant-context-m8',
      partialize: (state) => ({
        restaurantId: state.restaurantId,
        contextToken: state.contextToken,
        restaurantSlug: state.restaurantSlug,
        availableOffers: state.availableOffers,
        availablePromoCodes: state.availablePromoCodes,
        appliedCouponCode: state.appliedCouponCode,
      }),
    },
  ),
);

export function fallbackRestaurantId(slug: string): string {
  return `rest_${slug.replace(/-/g, '_')}`;
}
