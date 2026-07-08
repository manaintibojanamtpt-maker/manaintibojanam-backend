import { useCartStore } from '@/features/cart/store/cartStore';
import type { CartLineAddon } from '@/features/cart/store/cartStore';

export interface FoodPreviewLine {
  readonly lineId: string;
  readonly foodId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly variantId?: string;
  readonly variantLabel?: string;
  readonly addons?: readonly CartLineAddon[];
  readonly instructions?: string;
}

export interface FoodPreviewLineInput {
  readonly foodId: string;
  readonly name: string;
  readonly unitPrice: number;
  readonly variantId?: string;
  readonly variantLabel?: string;
  readonly addons?: readonly CartLineAddon[];
  readonly instructions?: string;
}

interface FoodPreviewState {
  readonly restaurantSlug: string | null;
  readonly lines: readonly FoodPreviewLine[];
  readonly visible: boolean;
  setRestaurant: (slug: string) => void;
  addItem: (line: FoodPreviewLineInput, quantity?: number) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  clear: () => void;
}

const bridgeActions = {
  setRestaurant: (slug: string) => useCartStore.getState().setRestaurant(slug),
  addItem: (line: FoodPreviewLineInput, quantity = 1) =>
    useCartStore.getState().addItem(
      {
        foodId: line.foodId,
        name: line.name,
        price: line.unitPrice,
        variantId: line.variantId,
        variantLabel: line.variantLabel,
        addons: line.addons,
        instructions: line.instructions,
      },
      quantity,
    ),
  setQuantity: (lineId: string, quantity: number) =>
    useCartStore.getState().setQuantity(lineId, quantity),
  clear: () => useCartStore.getState().clear(),
};

function toPreviewState(
  cart: ReturnType<typeof useCartStore.getState>,
): FoodPreviewState {
  return {
    restaurantSlug: cart.restaurantSlug,
    lines: cart.lines.map((line) => ({
      lineId: line.lineId,
      foodId: line.foodId,
      name: line.name,
      quantity: line.quantity,
      unitPrice: line.price,
      variantId: line.variantId,
      variantLabel: line.variantLabel,
      addons: line.addons,
      instructions: line.instructions,
    })),
    visible: cart.visible,
    ...bridgeActions,
  };
}

/** @deprecated Prefer useCartStore — bridged to cartStore for M6 food UI compatibility. */
export function useFoodPreviewStore<T>(selector: (state: FoodPreviewState) => T): T {
  // Never select `lines` here — toPreviewState maps a new array every snapshot and loops React 19.
  return useCartStore((cart) => selector(toPreviewState(cart)));
}

export function foodPreviewTotal(lines: readonly FoodPreviewLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}

export function foodPreviewCount(lines: readonly FoodPreviewLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
