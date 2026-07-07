export const INGREDIENT_UNITS = [
  'kg',
  'gm',
  'litre',
  'ml',
  'pcs',
  'packet',
  'bottle',
  'dozen',
] as const;

export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

export const INGREDIENT_CATEGORIES = [
  'Grains & Pulses',
  'Vegetables',
  'Dairy',
  'Meat & Poultry',
  'Seafood',
  'Spices & Masala',
  'Oils & Fats',
  'Beverages',
  'Packaging',
  'Other',
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export const MENU_RECIPE_CATEGORIES = ['All', 'Veg', 'Non Veg', 'Beverages', 'Desserts'] as const;

export type MenuRecipeCategoryFilter = (typeof MENU_RECIPE_CATEGORIES)[number];
