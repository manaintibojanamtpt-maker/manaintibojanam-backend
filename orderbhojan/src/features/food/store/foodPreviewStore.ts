import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FoodPreviewLine {
  readonly foodId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

interface FoodPreviewState {
  readonly restaurantSlug: string | null;
  readonly lines: readonly FoodPreviewLine[];
  readonly visible: boolean;
  setRestaurant: (slug: string) => void;
  addItem: (line: Omit<FoodPreviewLine, 'quantity'>, quantity?: number) => void;
  setQuantity: (foodId: string, quantity: number) => void;
  clear: () => void;
}

export const useFoodPreviewStore = create<FoodPreviewState>()(
  persist(
    (set, get) => ({
      restaurantSlug: null,
      lines: [],
      visible: false,
      setRestaurant: (slug) => {
        if (get().restaurantSlug !== slug) {
          set({ restaurantSlug: slug, lines: [], visible: false });
        }
      },
      addItem: (line, quantity = 1) => {
        const current = get().lines;
        const existing = current.find((l) => l.foodId === line.foodId);
        if (existing) {
          set({
            lines: current.map((l) =>
              l.foodId === line.foodId
                ? { ...l, quantity: l.quantity + quantity }
                : l,
            ),
            visible: true,
          });
          return;
        }
        set({
          lines: [...current, { ...line, quantity }],
          visible: true,
        });
      },
      setQuantity: (foodId, quantity) => {
        if (quantity <= 0) {
          const next = get().lines.filter((l) => l.foodId !== foodId);
          set({ lines: next, visible: next.length > 0 });
          return;
        }
        set({
          lines: get().lines.map((l) => (l.foodId === foodId ? { ...l, quantity } : l)),
          visible: true,
        });
      },
      clear: () => set({ lines: [], visible: false }),
    }),
    { name: 'ob-food-preview-m6' },
  ),
);

export function foodPreviewTotal(lines: readonly FoodPreviewLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}

export function foodPreviewCount(lines: readonly FoodPreviewLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
