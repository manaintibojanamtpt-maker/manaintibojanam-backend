import type { FirestoreTenantRecord } from './projectFoodMenuV1.js';
import type { FoodMenuApiEnvelopeDTO } from '@bhojan/marketplace-contracts';

type MenuEnvelope = FoodMenuApiEnvelopeDTO;

function toPublicFoodItem(food: MenuEnvelope['items'][number]) {
  return {
    foodId: food.foodId,
    slug: food.slug,
    name: food.name,
    description: food.description,
    image: food.media.hero.url,
    price: food.pricing.regularPrice.amount,
    offerPrice: food.pricing.sellingPrice?.amount,
    currency: food.pricing.regularPrice.currency,
    categoryId: food.categoryId,
    rating: food.metadata.rating,
    dietary: food.metadata.dietary,
    preparationTime: food.metadata.preparationMinutes,
    availability: food.availability.status === 'available',
    ownerLabels: food.labels.map((label) => ({ kind: label.kind, displayText: label.displayText })),
    ownerOfferDisplayText: food.offer?.displayText,
  };
}

export function projectFoodCategories(slug: string, menu: MenuEnvelope) {
  return {
    slug,
    categories: menu.categories.map((category) => ({
      id: category.categoryId,
      slug: category.slug,
      name: category.name,
      itemCount: category.itemCount,
    })),
  };
}

export function projectFoodRecommended(slug: string, menu: MenuEnvelope, _tenant: FirestoreTenantRecord) {
  const featured = new Set(menu.featuredFoodIds ?? []);
  const items = menu.items.filter((item) => featured.has(item.foodId)).map(toPublicFoodItem);
  return { slug, items: items.length > 0 ? items : menu.items.slice(0, 6).map(toPublicFoodItem) };
}

export function projectFoodBestsellers(slug: string, menu: MenuEnvelope) {
  const sorted = [...menu.items].sort((a, b) => (b.metadata.rating ?? 0) - (a.metadata.rating ?? 0));
  return { slug, items: sorted.slice(0, 8).map(toPublicFoodItem) };
}
