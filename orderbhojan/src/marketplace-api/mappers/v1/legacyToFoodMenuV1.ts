import {
  CONTRACT_SCHEMA_VERSION,
  type AddonGroupDTO,
  type AddonOptionDTO,
  type CategoryDTO,
  type FoodAvailabilityDTO,
  type FoodDTO,
  type FoodMenuApiEnvelopeDTO,
  type FoodMenuDTO,
  type ImageDTO,
  type LabelDTO,
  type MoneyDTO,
  type OfferDTO,
  type ThemeDTO,
  type VariantDTO,
  type VariantKind,
} from '@bhojan/marketplace-contracts';
import { MOCK_CONTEXT_TOKEN, MOCK_RESTAURANTS } from '../../mocks/fixtures';
import type { FoodPublic, FoodVariantKind } from '@/types/marketplace-food';

const V = CONTRACT_SCHEMA_VERSION;

function money(amount: number, currency = 'INR'): MoneyDTO {
  return { schemaVersion: V, amount, currency };
}

function imageFromUrl(url: string, assetId: string, alt?: string): ImageDTO {
  return { schemaVersion: V, assetId, url, alt };
}

function availabilityFromLegacy(available: boolean): FoodAvailabilityDTO {
  return {
    schemaVersion: V,
    status: available ? 'available' : 'out_of_stock',
    consumerMessage: available ? undefined : 'Sold out',
  };
}

function mapDietary(dietary: FoodPublic['dietary']) {
  switch (dietary) {
    case 'veg':
      return 'veg' as const;
    case 'egg':
      return 'egg' as const;
    case 'nonVeg':
    default:
      return 'non_veg' as const;
  }
}

function mapSpice(level?: FoodPublic['spiceLevel']) {
  switch (level) {
    case 'mild':
      return 'mild' as const;
    case 'medium':
      return 'medium' as const;
    case 'hot':
      return 'hot' as const;
    case 'extraHot':
      return 'extra_hot' as const;
    default:
      return undefined;
  }
}

function mapVariantKind(kind: FoodVariantKind): VariantKind {
  if (kind === '500gm' || kind === '1kg') return kind;
  if (kind === 'custom') return 'custom';
  return kind as VariantKind;
}

function labelsFromLegacy(food: FoodPublic): LabelDTO[] {
  const labels: LabelDTO[] = [];
  const owner = food.ownerLabels ?? [];

  for (const entry of owner) {
    labels.push({ schemaVersion: V, kind: entry.kind, displayText: entry.displayText });
  }

  if (labels.length > 0) return labels;

  if (food.bestSeller) {
    labels.push({ schemaVersion: V, kind: 'BESTSELLER', displayText: 'Bestseller' });
  }
  if (food.chefSpecial) {
    labels.push({ schemaVersion: V, kind: 'CHEF_PICK', displayText: 'Chef recommended' });
  }
  if (food.newItem) {
    labels.push({ schemaVersion: V, kind: 'NEW', displayText: 'New' });
  }
  if (food.recommended) {
    labels.push({ schemaVersion: V, kind: 'POPULAR', displayText: 'Recommended' });
  }
  for (const text of food.dietaryLabels ?? []) {
    labels.push({ schemaVersion: V, kind: 'CUSTOM', displayText: text });
  }

  return labels;
}

function offerFromLegacy(food: FoodPublic): OfferDTO | undefined {
  if (food.ownerOfferDisplayText) {
    return {
      schemaVersion: V,
      offerId: `offer_${food.foodId}`,
      enabled: true,
      displayText: food.ownerOfferDisplayText,
      priority: 1,
      validity: { schemaVersion: V, recurring: false },
      type: 'custom',
    };
  }

  if (!food.offerPrice || food.offerPrice >= food.price) return undefined;

  return {
    schemaVersion: V,
    offerId: `offer_${food.foodId}`,
    enabled: true,
    displayText: 'Special price',
    priority: 1,
    validity: { schemaVersion: V, recurring: false },
    type: 'flat_amount',
  };
}

function mapVariants(food: FoodPublic): VariantDTO[] {
  return food.variants.map((variant, index) => {
    const base = food.price;
    const absolute = variant.offerPrice ?? variant.price;
    const delta = absolute - base;
    return {
      schemaVersion: V,
      variantId: variant.id,
      kind: mapVariantKind(variant.kind),
      displayName: variant.label,
      priceDelta: money(delta),
      absolutePrice: money(absolute),
      availability: availabilityFromLegacy(food.availability),
      sortOrder: index,
      isDefault: index === 0,
    };
  });
}

function mapAddonGroups(food: FoodPublic): AddonGroupDTO[] {
  if (food.addons.length === 0) return [];

  const options: AddonOptionDTO[] = food.addons.map((addon, index) => ({
    schemaVersion: V,
    optionId: addon.id,
    displayName: addon.label,
    kind: addon.kind,
    pricing: { schemaVersion: V, price: money(addon.price) },
    availability: availabilityFromLegacy(food.availability),
    maxQuantity: addon.maxQuantity,
    sortOrder: index,
  }));

  return [
    {
      schemaVersion: V,
      groupId: `addons_${food.foodId}`,
      displayName: 'Add-ons',
      selectionRules: {
        schemaVersion: V,
        required: false,
        minSelections: 0,
        maxSelections: options.length,
        allowMultiplePerOption: true,
      },
      sortOrder: 0,
      options,
    },
  ];
}

export function mapFoodPublicToFoodDTO(
  food: FoodPublic,
  restaurantId: string,
  displayOrder: number,
): FoodDTO {
  const heroUrl = food.image ?? '';
  const offer = offerFromLegacy(food);

  return {
    schemaVersion: V,
    foodId: food.foodId,
    slug: food.slug,
    restaurantId,
    categoryId: food.categoryId,
    name: food.name,
    description: food.description,
    displayOrder,
    media: {
      schemaVersion: V,
      hero: imageFromUrl(heroUrl, `img_${food.foodId}`, food.name),
      gallery: heroUrl ? [imageFromUrl(heroUrl, `img_${food.foodId}_g0`, food.name)] : [],
    },
    pricing: {
      schemaVersion: V,
      regularPrice: money(food.price, food.currency),
      sellingPrice: offer ? money(food.offerPrice ?? food.price, food.currency) : undefined,
      taxIncluded: true,
    },
    availability: availabilityFromLegacy(food.availability),
    labels: labelsFromLegacy(food),
    offer,
    variants: mapVariants(food),
    addonGroups: mapAddonGroups(food),
    story: food.chefNote
      ? {
          schemaVersion: V,
          chefNote: food.chefNote,
          ingredients: [...(food.ingredients ?? [])],
          cookingStyle: food.cookingStyle,
          servingSize: food.servingSize,
          popularPairingLabel: food.popularPairing,
          popularPairingFoodIds: [],
        }
      : undefined,
    nutrition: food.nutritionSummary
      ? { schemaVersion: V, summary: food.nutritionSummary }
      : undefined,
    allergens: food.allergenSummary
      ? { schemaVersion: V, summary: food.allergenSummary, tags: [] }
      : undefined,
    metadata: {
      schemaVersion: V,
      dietary: mapDietary(food.dietary),
      spiceLevel: mapSpice(food.spiceLevel),
      preparationMinutes: food.preparationTime,
      rating: food.rating,
    },
  };
}

function defaultTheme(slug: string): ThemeDTO {
  const restaurant = MOCK_RESTAURANTS.find((r) => r.restaurantSlug === slug);
  const logoUrl = restaurant?.logoUrl ?? 'https://cdn.bhojan.app/brand/default-logo.png';
  return {
    schemaVersion: V,
    logo: imageFromUrl(logoUrl, `theme_logo_${slug}`, restaurant?.displayName),
    colors: { schemaVersion: V, primary: '#E85D04' },
    brandAssets: [],
  };
}

export function mapLegacyMenuToFoodMenuDTO(
  slug: string,
  restaurantName: string | undefined,
  categories: readonly { id: string; slug: string; name: string; itemCount: number }[],
  items: readonly FoodPublic[],
  featuredIds: readonly string[],
  todaysSpecialIds: readonly string[],
  restaurantId: string,
): FoodMenuDTO {
  const categoryDtos: CategoryDTO[] = categories.map((cat, index) => ({
    schemaVersion: V,
    categoryId: cat.id,
    slug: cat.slug,
    name: cat.name,
    displayOrder: index,
    visibility: 'visible',
    itemCount: cat.itemCount,
  }));

  const foodDtos = items.map((item, index) =>
    mapFoodPublicToFoodDTO(item, restaurantId, index),
  );

  return {
    schemaVersion: V,
    slug,
    restaurantName: restaurantName ?? slug,
    theme: defaultTheme(slug),
    categories: categoryDtos,
    items: foodDtos,
    featuredFoodIds: [...featuredIds],
    todaysSpecialFoodIds: [...todaysSpecialIds],
  };
}

export function buildFoodMenuContractPayload(
  slug: string,
  legacyMenu: {
    slug: string;
    restaurantName?: string;
    categories: readonly { id: string; slug: string; name: string; itemCount: number }[];
    items: readonly FoodPublic[];
    featuredIds: readonly string[];
    todaysSpecialIds: readonly string[];
  },
  contextToken: string,
): FoodMenuApiEnvelopeDTO {
  const restaurant = MOCK_RESTAURANTS.find((r) => r.restaurantSlug === slug);
  const restaurantId = restaurant?.restaurantId ?? `rest_${slug}`;

  return {
    ...mapLegacyMenuToFoodMenuDTO(
      legacyMenu.slug,
      legacyMenu.restaurantName,
      legacyMenu.categories,
      legacyMenu.items,
      legacyMenu.featuredIds,
      legacyMenu.todaysSpecialIds,
      restaurantId,
    ),
    contextToken,
  };
}

export { MOCK_CONTEXT_TOKEN };
