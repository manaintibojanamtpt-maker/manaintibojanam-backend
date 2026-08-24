import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getActiveMenuRouteSlug, menuRouteRestaurantId } from '@/features/food/engine/foodMenuRouteContext';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import { notifyToast } from '@/shared/providers/BdsToastProvider';

export interface CartLineAddon {
  readonly id: string;
  readonly label: string;
  readonly price: number;
}

export interface CartLineInput {
  readonly foodId: string;
  readonly name: string;
  readonly price: number;
  readonly variantId?: string;
  readonly variantLabel?: string;
  readonly addons?: readonly CartLineAddon[];
  readonly instructions?: string;
}

export interface CartLine extends CartLineInput {
  readonly lineId: string;
  readonly quantity: number;
  readonly restaurantSlug: string;
  readonly restaurantId: string;
}

interface CartState {
  readonly lines: readonly CartLine[];
  readonly restaurantSlug: string | null;
  readonly visible: boolean;
  /** True once zustand persist has finished rehydrating from storage. */
  _hasHydrated: boolean;
  setRestaurant: (slug: string) => void;
  addItem: (line: CartLineInput, quantity?: number) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  clear: () => void;
  _setHasHydrated: (value: boolean) => void;
}

const CROSS_RESTAURANT_TOAST =
  'Your cart was cleared because items can only be ordered from one restaurant at a time.';

function readRestaurantContext(): { restaurantSlug: string; restaurantId: string } | null {
  const ctx = useRestaurantContextStore.getState();
  if (ctx.restaurantSlug && ctx.restaurantId) {
    return { restaurantSlug: ctx.restaurantSlug, restaurantId: ctx.restaurantId };
  }

  const cartSlug = useCartStore.getState().restaurantSlug;
  if (cartSlug) {
    return { restaurantSlug: cartSlug, restaurantId: menuRouteRestaurantId(cartSlug) };
  }

  const menuRouteSlug = getActiveMenuRouteSlug();
  if (menuRouteSlug) {
    return {
      restaurantSlug: menuRouteSlug,
      restaurantId: menuRouteRestaurantId(menuRouteSlug),
    };
  }

  return null;
}

export function buildCartLineId(
  input: Pick<CartLineInput, 'foodId' | 'variantId' | 'addons' | 'instructions'>,
): string {
  const addonIds = (input.addons ?? []).map((addon) => addon.id).sort().join(',');
  const instructions = input.instructions?.trim() ?? '';
  const hasExtras = Boolean(input.variantId || addonIds || instructions);
  if (!hasExtras) return input.foodId;
  return `${input.foodId}:${input.variantId ?? ''}:${addonIds}:${instructions}`;
}

function notifyCrossRestaurantSwitch(): void {
  notifyToast(CROSS_RESTAURANT_TOAST, 'warning');
}

/**
 * Determines if a cross-restaurant clear should be allowed.
 * Returns true ONLY if both cart and restaurant context stores are hydrated
 * AND there is a confirmed restaurant mismatch.
 *
 * UNKNOWN context (null/undefined during hydration) MUST NOT trigger a clear.
 */
function canClearForRestaurantMismatch(
  currentSlug: string | null,
  newSlug: string,
  hasItems: boolean
): boolean {
  // Check hydration state
  // UNKNOWN hydration (persist middleware not initialized OR hasHydrated returns false)
  // MUST NOT trigger a destructive clear.
  // If persist middleware is unavailable (Node tests without localStorage), infer
  // hydration from CONFIRMED state: non-null restaurantSlug/contextToken for context,
  // and non-null restaurantSlug or non-empty lines for cart.
  // Use || not ?? because hasHydrated() can return FALSE (boolean), not just null/undefined.
  const contextHydrated =
    useRestaurantContextStore.persist?.hasHydrated?.() ||
    (useRestaurantContextStore.getState().restaurantSlug !== null &&
      useRestaurantContextStore.getState().contextToken !== null);
  const cartHydrated =
    useCartStore.persist?.hasHydrated?.() ||
    (useCartStore.getState().restaurantSlug !== null || useCartStore.getState().lines.length > 0);

  if (!contextHydrated || !cartHydrated) {
    return false; // Don't clear during hydration race / unknown state
  }

  // Only clear if there's a CONFIRMED mismatch
  return hasItems && Boolean(currentSlug && currentSlug !== newSlug);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      restaurantSlug: null,
      visible: false,
      _hasHydrated: false,

      _setHasHydrated: (value) => set({ _hasHydrated: value }),

      setRestaurant: (slug) => {
        const prev = get();
        if (prev.restaurantSlug !== slug) {
          // Only clear cart if BOTH stores are hydrated AND there's a confirmed mismatch
          if (canClearForRestaurantMismatch(prev.restaurantSlug, slug, prev.lines.length > 0)) {
            notifyCrossRestaurantSwitch();
            set({ restaurantSlug: slug, lines: [], visible: false });
          } else {
            // Just update the slug, keep existing cart items
            set({ restaurantSlug: slug });
          }
        }
      },

      addItem: (line, quantity = 1) => {
        const ctx = readRestaurantContext();
        if (!ctx) {
          notifyToast('Open a restaurant menu before adding items to cart.', 'warning');
          return;
        }

        let current = get().lines;
        // Only clear for mismatch if both stores are hydrated and confirmed mismatch
        if (
          current.length > 0 &&
          current[0].restaurantSlug !== ctx.restaurantSlug &&
          canClearForRestaurantMismatch(current[0].restaurantSlug, ctx.restaurantSlug, true)
        ) {
          notifyCrossRestaurantSwitch();
          current = [];
        }

        const lineId = buildCartLineId(line);
        const existing = current.find((l) => l.lineId === lineId);
        if (existing) {
          set({
            restaurantSlug: ctx.restaurantSlug,
            lines: current.map((l) =>
              l.lineId === lineId
                ? { ...l, quantity: l.quantity + quantity }
                : l,
            ),
            visible: true,
          });
          return;
        }

        set({
          restaurantSlug: ctx.restaurantSlug,
          lines: [
            ...current,
            {
              ...line,
              lineId,
              quantity,
              restaurantSlug: ctx.restaurantSlug,
              restaurantId: ctx.restaurantId,
            },
          ],
          visible: true,
        });
      },

      setQuantity: (lineId, quantity) => {
        if (quantity <= 0) {
          const next = get().lines.filter((l) => l.lineId !== lineId);
          set({ lines: next, visible: next.length > 0 });
          return;
        }
        set({
          lines: get().lines.map((l) =>
            l.lineId === lineId ? { ...l, quantity } : l,
          ),
          visible: true,
        });
      },

      clear: () => set({ lines: [], visible: false }),
    }),
    { name: 'ob-cart-m7',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true;
          if (state.lines.length > 0) {
            useCartStore.setState({ visible: true });
          }
        }
      },
    },
  ),
);

export function cartLineUnitPrice(line: CartLine): number {
  const addonsTotal = line.addons?.reduce((sum, addon) => sum + addon.price, 0) ?? 0;
  return line.price + addonsTotal;
}

export function cartSubtotal(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + cartLineUnitPrice(line) * line.quantity, 0);
}

export function cartItemCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function formatCartLineTotal(line: CartLine): string {
  return `₹${cartLineUnitPrice(line) * line.quantity}`;
}
