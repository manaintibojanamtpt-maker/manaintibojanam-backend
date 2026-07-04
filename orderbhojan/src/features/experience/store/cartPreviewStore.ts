import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartPreviewState {
  readonly itemCount: number;
  readonly totalPaise: number;
  readonly visible: boolean;
  addMockItem: (price: number) => void;
  removeMockItem: () => void;
  showPreview: () => void;
  hidePreview: () => void;
  reset: () => void;
}

export const useCartPreviewStore = create<CartPreviewState>()(
  persist(
    (set, get) => ({
      itemCount: 0,
      totalPaise: 0,
      visible: false,
      addMockItem: (price) => {
        set({
          itemCount: get().itemCount + 1,
          totalPaise: get().totalPaise + price * 100,
          visible: true,
        });
      },
      removeMockItem: () => {
        const next = Math.max(0, get().itemCount - 1);
        set({
          itemCount: next,
          visible: next > 0,
          totalPaise: next === 0 ? 0 : Math.max(0, get().totalPaise - 19900),
        });
      },
      showPreview: () => set({ visible: true, itemCount: Math.max(get().itemCount, 1), totalPaise: get().totalPaise || 24900 }),
      hidePreview: () => set({ visible: false }),
      reset: () => set({ itemCount: 0, totalPaise: 0, visible: false }),
    }),
    { name: 'ob-cart-preview-m15' },
  ),
);

export function formatCartTotal(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}
