import { create } from 'zustand';
import type { FoodCategoryId } from '../domain/experience.types';

interface CategoryState {
  readonly selectedId: FoodCategoryId | null;
  select: (id: FoodCategoryId) => void;
  clear: () => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  selectedId: null,
  select: (id) => set({ selectedId: id }),
  clear: () => set({ selectedId: null }),
}));
