import type {
  FoodDTO,
  FoodMenuDTO,
  LabelKind,
  SpiceLevel,
  VariantKind,
} from '@bhojan/marketplace-contracts';
import type {
  DietaryType,
  FoodAddon,
  FoodPublic,
  FoodMenuResponse,
  FoodVariant,
  FoodVariantKind,
  SpiceLevel as LegacySpiceLevel,
} from '@/types/marketplace-food';

function mapDietaryToLegacy(dietary: FoodDTO['metadata']['dietary']): DietaryType {
  switch (dietary) {
    case 'veg':
    case 'vegan':
    case 'jain':
      return 'veg';
    case 'egg':
      return 'egg';
    case 'non_veg':
    case 'halal':
    default:
      return 'nonVeg';
  }
}

function mapSpiceToLegacy(level?: SpiceLevel): LegacySpiceLevel | undefined {
  switch (level) {
    case 'mild':
      return 'mild';
    case 'medium':
      return 'medium';
    case 'hot':
      return 'hot';
    case 'extra_hot':
      return 'extraHot';
    default:
      return undefined;
  }
}

function mapVariantKindToLegacy(kind: VariantKind): FoodVariantKind {
  if (kind === '500gm' || kind === '1kg' || kind === 'custom') return kind;
  if (kind === 'mini' || kind === 'family' || kind === 'regular') return 'custom';
  return kind as FoodVariantKind;
}

function resolveVariantPrice(food: FoodDTO, variant: FoodDTO['variants'][number]): number {
  if (variant.absolutePrice) return variant.absolutePrice.amount;
  return food.pricing.regularPrice.amount + variant.priceDelta.amount;
}

function mapVariants(food: FoodDTO): FoodVariant[] {
  const selling = food.pricing.sellingPrice?.amount;
  return food.variants.map((variant) => {
    const price = resolveVariantPrice(food, variant);
    const baseRegular = food.pricing.regularPrice.amount;
    const offerPrice =
      selling != null && price > selling ? selling + (price - baseRegular) : undefined;
    return {
      id: variant.variantId,
      kind: mapVariantKindToLegacy(variant.kind),
      label: variant.displayName,
      price,
      offerPrice: offerPrice != null && offerPrice < price ? offerPrice : undefined,
    };
  });
}

function flattenAddons(food: FoodDTO): FoodAddon[] {
  const addons: FoodAddon[] = [];
  for (const group of food.addonGroups) {
    for (const option of group.options) {
      addons.push({
        id: option.optionId,
        kind: option.kind,
        label: option.displayName,
        price: option.pricing.price.amount,
        maxQuantity: option.maxQuantity,
      });
    }
  }
  return addons;
}

function labelKindFlags(labels: FoodDTO['labels']) {
  const kinds = new Set(labels.map((l) => l.kind));
  return {
    bestSeller: kinds.has('BESTSELLER'),
    chefSpecial: kinds.has('CHEF_PICK'),
    newItem: kinds.has('NEW'),
    recommended: kinds.has('POPULAR'),
  };
}

export function mapFoodDTOToFoodPublic(food: FoodDTO): FoodPublic {
  const flags = labelKindFlags(food.labels);
  const available = food.availability.status === 'available';

  return {
    foodId: food.foodId,
    slug: food.slug,
    name: food.name,
    description: food.description,
    image: food.media.hero.url,
    price: food.pricing.regularPrice.amount,
    offerPrice: food.pricing.sellingPrice?.amount,
    currency: food.pricing.regularPrice.currency,
    category: '',
    categoryId: food.categoryId,
    rating: food.metadata.rating,
    dietary: mapDietaryToLegacy(food.metadata.dietary),
    preparationTime: food.metadata.preparationMinutes,
    availability: available,
    ...flags,
    variants: mapVariants(food),
    addons: flattenAddons(food),
    nutritionSummary: food.nutrition?.summary,
    allergenSummary: food.allergens?.summary,
    chefNote: food.story?.chefNote,
    ingredients: food.story?.ingredients,
    cookingStyle: food.story?.cookingStyle,
    servingSize: food.story?.servingSize,
    popularPairing: food.story?.popularPairingLabel,
    spiceLevel: mapSpiceToLegacy(food.metadata.spiceLevel),
    ownerLabels: food.labels.map((l) => ({
      kind: l.kind as LabelKind,
      displayText: l.displayText,
    })),
    ownerOfferDisplayText: food.offer?.displayText,
    contractSource: true,
  };
}

export function mapFoodMenuDTOToFoodMenuResponse(menu: FoodMenuDTO): FoodMenuResponse {
  const categoryNameById = new Map(menu.categories.map((c) => [c.categoryId, c.name]));

  const items = menu.items.map((item) => {
    const mapped = mapFoodDTOToFoodPublic(item);
    return {
      ...mapped,
      category: categoryNameById.get(item.categoryId) ?? mapped.categoryId,
    };
  });

  return {
    slug: menu.slug,
    restaurantName: menu.restaurantName,
    categories: menu.categories.map((c) => ({
      id: c.categoryId,
      slug: c.slug,
      name: c.name,
      itemCount: c.itemCount,
    })),
    items,
    featuredIds: [...menu.featuredFoodIds],
    todaysSpecialIds: [...menu.todaysSpecialFoodIds],
  };
}
