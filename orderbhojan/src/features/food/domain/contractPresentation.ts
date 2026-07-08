import type { FoodPublic } from '@/types/marketplace-food';
import { formatOfferLabel } from './formatters';

export function resolveOfferDisplayText(food: FoodPublic): string | undefined {
  if (food.ownerOfferDisplayText) return food.ownerOfferDisplayText;
  if (food.contractSource) return undefined;
  return formatOfferLabel(food);
}

export function resolveFoodLabelBadges(
  food: FoodPublic,
): readonly { displayText: string }[] {
  if (food.ownerLabels && food.ownerLabels.length > 0) {
    return food.ownerLabels.map((label) => ({ displayText: label.displayText }));
  }

  const legacy: { displayText: string }[] = [];
  if (food.bestSeller) legacy.push({ displayText: 'Bestseller' });
  if (food.chefSpecial) legacy.push({ displayText: 'Chef recommended' });
  if (food.newItem) legacy.push({ displayText: 'New' });
  if (food.recommended) legacy.push({ displayText: 'Recommended' });
  return legacy;
}

export function hasBestsellerLabel(food: FoodPublic): boolean {
  if (food.ownerLabels?.some((l) => l.kind === 'BESTSELLER')) return true;
  return food.bestSeller === true;
}
