import type { FoodPublic } from '@/types/marketplace-food';

export function formatFoodPrice(food: FoodPublic, variantPrice?: number): string {
  const amount = variantPrice ?? food.offerPrice ?? food.price;
  return `₹${amount}`;
}

export function formatOfferLabel(food: FoodPublic): string | undefined {
  if (!food.offerPrice || food.offerPrice >= food.price) return undefined;
  const pct = Math.round(((food.price - food.offerPrice) / food.price) * 100);
  return `${pct}% OFF`;
}

export function dietaryLabel(dietary: FoodPublic['dietary']): string {
  switch (dietary) {
    case 'veg':
      return 'Veg';
    case 'egg':
      return 'Egg';
    case 'nonVeg':
    default:
      return 'Non-Veg';
  }
}

export function isVegFood(food: FoodPublic): boolean {
  return food.dietary === 'veg';
}

export function preparationLabel(minutes?: number): string | undefined {
  if (minutes == null) return undefined;
  return `${minutes} min`;
}

export function ratingLabel(rating?: number): string | undefined {
  if (rating == null) return undefined;
  return `★ ${rating.toFixed(1)}`;
}

export function spiceLabel(level?: FoodPublic['spiceLevel']): string | undefined {
  switch (level) {
    case 'mild':
      return 'Mild';
    case 'medium':
      return 'Medium spice';
    case 'hot':
      return 'Hot';
    case 'extraHot':
      return 'Extra hot';
    default:
      return undefined;
  }
}

export function groupItemsByCategory(
  items: readonly FoodPublic[],
): Map<string, FoodPublic[]> {
  const map = new Map<string, FoodPublic[]>();
  for (const item of items) {
    const list = map.get(item.categoryId) ?? [];
    list.push(item);
    map.set(item.categoryId, list);
  }
  return map;
}
