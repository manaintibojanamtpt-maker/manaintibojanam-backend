import type { FoodPublic } from '@/types/marketplace-food';
import type { MenuItemBadge, MenuItemCardViewModel } from '@bhojan/storefront-design-system/food/types';
import { resolveFoodItemPhoto } from '@/features/food/data/food-item-photo-manifest';
import {
  resolveFoodLabelBadges,
  resolveOfferDisplayText,
  hasBestsellerLabel,
} from '@/features/food/domain/contractPresentation';
import {
  formatFoodPrice,
  isVegFood,
  preparationLabel,
  ratingLabel,
  spiceLabel,
} from '@/features/food/domain/formatters';

function dietaryType(food: FoodPublic): MenuItemCardViewModel['dietary'] {
  if (isVegFood(food)) return 'veg';
  if (food.dietary === 'egg') return 'egg';
  return 'nonVeg';
}

function buildBadges(food: FoodPublic): MenuItemBadge[] {
  const badges: MenuItemBadge[] = [];
  for (const label of resolveFoodLabelBadges(food)) {
    const lower = label.displayText.toLowerCase();
    const trending =
      lower.includes('best') || lower.includes('popular') || lower.includes('trending');
    badges.push({
      text: label.displayText,
      tone: trending ? 'trending' : 'offer',
    });
  }
  const offer = resolveOfferDisplayText(food);
  if (offer) badges.push({ text: offer, tone: 'offer' });
  if (hasBestsellerLabel(food) && !badges.some((b) => b.text.toLowerCase().includes('best'))) {
    badges.push({ text: 'Bestseller', tone: 'trending' });
  }
  return badges;
}

function buildMeta(food: FoodPublic): string[] {
  const meta: string[] = [];
  const rating = ratingLabel(food.rating);
  if (rating) meta.push(rating);
  const spice = spiceLabel(food.spiceLevel);
  if (spice) meta.push(spice);
  const prep = preparationLabel(food.preparationTime);
  if (prep) meta.push(prep);
  return meta;
}

function resolvePhoto(food: FoodPublic, width: number, sizes: string) {
  if (food.image?.trim()) {
    const src = food.image.trim();
    return { src, srcSet: '', sizes, blurDataURL: '', sources: [{ srcSet: src, type: 'image/jpeg' as const }] };
  }
  const photo = resolveFoodItemPhoto(food.foodId, width, sizes, 82);
  return photo;
}

export function mapFoodToMenuItemCardView(food: FoodPublic, sizes = '8.5rem'): MenuItemCardViewModel {
  const photo = resolvePhoto(food, 480, sizes);
  return {
    id: food.foodId,
    name: food.name,
    description: food.description,
    priceLabel: formatFoodPrice(food),
    imageUrl: photo.src,
    imageAlt: food.name,
    dietary: dietaryType(food),
    ratingLabel: ratingLabel(food.rating) ?? undefined,
    badges: buildBadges(food),
    metaLabels: buildMeta(food),
    unavailable: !food.availability,
  };
}

export function mapFoodToFeaturedCardView(food: FoodPublic): MenuItemCardViewModel {
  const photo = resolvePhoto(food, 640, '42vw');
  return {
    ...mapFoodToMenuItemCardView(food, '42vw'),
    imageUrl: photo.src,
  };
}
