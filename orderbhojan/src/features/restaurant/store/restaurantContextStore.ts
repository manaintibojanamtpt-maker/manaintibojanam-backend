import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PublicPromoCoupon, RestaurantOffer } from '@/types/marketplace-restaurant';

interface RestaurantContextState {
  readonly restaurantId: string | null;
  readonly contextToken: string | null;
  readonly restaurantSlug: string | null;
  /** Restaurant coordinates from experience load — used for local delivery fee estimation. */
  readonly restaurantLat: number | null;
  readonly restaurantLng: number | null;
  readonly availableOffers: readonly RestaurantOffer[];
  readonly availablePromoCodes: readonly PublicPromoCoupon[];
  readonly appliedCouponCode: string | null;
  /** Kitchen-enabled methods from menu/prepare — used for instant checkout Pay using. */
  readonly paymentMethods: readonly string[] | null;
  /** Delivery fee from restaurant experience (may be null if not yet known). */
  readonly deliveryFee: number | null;
  readonly deliveryFeeKnown: boolean;
  setContext: (ctx: {
    readonly restaurantId: string;
    readonly contextToken: string;
    readonly restaurantSlug: string;
    readonly restaurantLat?: number | null;
    readonly restaurantLng?: number | null;
  }) => void;
  setPaymentMethods: (methods: readonly string[] | null) => void;
  setPromoContext: (ctx: {
    readonly offers?: readonly RestaurantOffer[];
    readonly promoCodes?: readonly PublicPromoCoupon[];
  }) => void;
  setAppliedCouponCode: (code: string | null) => void;
  setDeliveryFee: (fee: number | null, known: boolean) => void;
  clear: () => void;
}

function isPlaceholderContextToken(token: string | null | undefined): boolean {
  if (!token) return true;
  return token.startsWith('menu_');
}

export const useRestaurantContextStore = create<RestaurantContextState>()(
  persist(
    (set) => ({
      restaurantId: null,
      contextToken: null,
      restaurantSlug: null,
      restaurantLat: null,
      restaurantLng: null,
      availableOffers: [],
      availablePromoCodes: [],
      appliedCouponCode: null,
      paymentMethods: null,
      deliveryFee: null,
      deliveryFeeKnown: false,

      setContext: (ctx) =>
        set((state) => {
          const kitchenChanged = state.restaurantSlug !== ctx.restaurantSlug;

          if (kitchenChanged) {
            return {
              restaurantId: ctx.restaurantId,
              contextToken: ctx.contextToken,
              restaurantSlug: ctx.restaurantSlug,
              restaurantLat: ctx.restaurantLat ?? null,
              restaurantLng: ctx.restaurantLng ?? null,
              availableOffers: [],
              availablePromoCodes: [],
              appliedCouponCode: null,
              paymentMethods: null,
            };
          }

          // Same kitchen: NEVER rotate contextToken — menu/cart refetches mint a new token
          // and would restart checkout/prepare forever ("Updating taxes…").
          let nextToken = state.contextToken || ctx.contextToken;
          if (isPlaceholderContextToken(state.contextToken) && ctx.contextToken) {
            nextToken = ctx.contextToken;
          } else if (state.contextToken && !isPlaceholderContextToken(state.contextToken)) {
            nextToken = state.contextToken;
          }

          return {
            ...state,
            restaurantSlug: ctx.restaurantSlug || state.restaurantSlug,
            restaurantId: ctx.restaurantId || state.restaurantId,
            restaurantLat: ctx.restaurantLat ?? state.restaurantLat,
            restaurantLng: ctx.restaurantLng ?? state.restaurantLng,
            contextToken: nextToken,
          };
        }),

      setPaymentMethods: (methods) =>
        set({
          paymentMethods:
            methods && methods.length > 0
              ? [...new Set(methods.map((m) => m.trim().toLowerCase()).filter(Boolean))]
              : null,
        }),

      setPromoContext: (ctx) =>
        set({
          availableOffers: ctx.offers ?? [],
          availablePromoCodes: ctx.promoCodes ?? [],
        }),

      setAppliedCouponCode: (code) =>
        set({ appliedCouponCode: code?.trim().toUpperCase() || null }),

      setDeliveryFee: (fee, known) =>
        set({ deliveryFee: fee, deliveryFeeKnown: known }),

      clear: () =>
        set({
          restaurantId: null,
          contextToken: null,
          restaurantSlug: null,
          restaurantLat: null,
          restaurantLng: null,
          availableOffers: [],
          availablePromoCodes: [],
          appliedCouponCode: null,
          paymentMethods: null,
          deliveryFee: null,
          deliveryFeeKnown: false,
        }),
    }),
    {
      name: 'ob-restaurant-context-m8',
      partialize: (state) => ({
        restaurantId: state.restaurantId,
        contextToken: state.contextToken,
        restaurantSlug: state.restaurantSlug,
        restaurantLat: state.restaurantLat,
        restaurantLng: state.restaurantLng,
        availableOffers: state.availableOffers,
        availablePromoCodes: state.availablePromoCodes,
        appliedCouponCode: state.appliedCouponCode,
        paymentMethods: state.paymentMethods,
        deliveryFee: state.deliveryFee,
        deliveryFeeKnown: state.deliveryFeeKnown,
      }),
    },
  ),
);

export function fallbackRestaurantId(slug: string): string {
  return `rest_${slug.replace(/-/g, '_')}`;
}

export function useRestaurantContext() {
  return useRestaurantContextStore();
}
