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
  setRestaurant: (slug: string) => void;
  addItem: (line: CartLineInput, quantity?: number) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  clear: () => void;
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

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      restaurantSlug: null,
      visible: false,

      setRestaurant: (slug) => {
        const prev = get();
        if (prev.restaurantSlug !== slug) {
          if (prev.lines.length > 0 && prev.restaurantSlug && prev.restaurantSlug !== slug) {
            notifyCrossRestaurantSwitch();
          }
          set({ restaurantSlug: slug, lines: [], visible: false });
        }
      },

      addItem: (line, quantity = 1) => {
        const ctx = readRestaurantContext();
        if (!ctx) {
          notifyToast('Open a restaurant menu before adding items to cart.', 'warning');
          return;
        }

        let current = get().lines;
        if (
          current.length > 0 &&
          current[0].restaurantSlug !== ctx.restaurantSlug
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
        if (state && state.lines.length > 0) {
          useCartStore.setState({ visible: true });
        }
      },
    },
  ),
);

export function cartSubtotal(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

export function cartItemCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function formatCartLineTotal(line: CartLine): string {
  return `₹${line.price * line.quantity}`;
}
