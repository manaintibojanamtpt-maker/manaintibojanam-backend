import { randomUUID } from 'crypto';
import {
  CONTRACT_SCHEMA_VERSION,
  type AddonGroupDTO,
  type AddonOptionDTO,
  type CategoryDTO,
  type FoodAvailabilityDTO,
  type FoodDTO,
  type FoodMenuApiEnvelopeDTO,
  type ImageDTO,
  type LabelDTO,
  type LabelKind,
  type MoneyDTO,
  type OfferDTO,
  type ThemeDTO,
  type VariantDTO,
  type VariantKind,
} from '@bhojan/marketplace-contracts';
import { parseTenantMarketplace, type TenantMarketplaceProjection } from '../domain/tenant-marketplace.js';

const V = CONTRACT_SCHEMA_VERSION;

export interface FirestoreCategoryRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly priority: number;
  readonly isActive: boolean;
  readonly showOnHome?: boolean;
  readonly image?: string;
}

export interface FirestoreMenuItemRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly category: string;
  readonly categoryId?: string;
  readonly price: number;
  readonly type: 'veg' | 'non-veg';
  readonly description?: string;
  readonly image?: string;
  readonly isAvailable: boolean;
  readonly labels?: readonly { kind: string; displayText: string }[];
  readonly offer?: {
    readonly displayText: string;
    readonly badge?: string;
    readonly type?: string;
    readonly priority?: number;
    readonly sellingPrice?: number;
  };
  readonly variants?: readonly {
    readonly variantId?: string;
    readonly kind?: string;
    readonly displayName: string;
    readonly price: number;
    readonly offerPrice?: number;
    readonly sortOrder?: number;
  }[];
  readonly addonGroups?: readonly {
    readonly groupId?: string;
    readonly displayName: string;
    readonly required?: boolean;
    readonly minSelections?: number;
    readonly maxSelections?: number;
    readonly options: readonly {
      readonly optionId?: string;
      readonly kind?: string;
      readonly displayName: string;
      readonly price: number;
      readonly maxQuantity?: number;
      readonly sortOrder?: number;
    }[];
  }[];
  readonly spiceLevel?: string;
  readonly preparationMinutes?: number;
  readonly chefNote?: string;
  readonly ingredients?: readonly string[];
  readonly cookingStyle?: string;
  readonly servingSize?: string;
  readonly popularPairing?: string;
  readonly nutritionSummary?: string;
  readonly allergenSummary?: string;
  readonly displayOrder?: number;
}

export interface FirestoreTenantRecord {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly marketplace?: TenantMarketplaceProjection;
  readonly branding?: { logoUrl?: string; coverUrl?: string };
  readonly storeOperations?: {
    isStoreOpen?: boolean;
    businessHoursEnabled?: boolean;
    openTime?: string;
    closeTime?: string;
    offlineMessage?: string;
  };
  readonly deliveryConfig?: {
    enabled?: boolean;
    freeRadius?: number;
    paidRadius?: number;
    maxRadius?: number;
    perKmCharge?: number;
    baseFee?: number;
    prepTime?: number;
    deliveryFee?: number;
    feesConfigured?: boolean;
    freeDeliveryMinOrder?: number;
  };
  readonly location?: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
    address?: string;
    pincode?: string;
  };
  readonly businessType?: string;
  readonly description?: string;
  readonly cuisineTags?: readonly string[];
}

function money(amount: number, currency = 'INR'): MoneyDTO {
  return { schemaVersion: V, amount, currency };
}

function imageFromUrl(url: string, assetId: string, alt?: string): ImageDTO {
  return { schemaVersion: V, assetId, url, alt };
}

function availability(available: boolean): FoodAvailabilityDTO {
  return {
    schemaVersion: V,
    status: available ? 'available' : 'out_of_stock',
    consumerMessage: available ? undefined : 'Sold out',
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapDietary(type: 'veg' | 'non-veg'): FoodDTO['metadata']['dietary'] {
  return type === 'veg' ? 'veg' : 'non_veg';
}

function mapSpice(raw?: string): FoodDTO['metadata']['spiceLevel'] | undefined {
  switch (raw) {
    case 'mild':
      return 'mild';
    case 'medium':
      return 'medium';
    case 'hot':
      return 'hot';
    case 'extraHot':
    case 'extra_hot':
      return 'extra_hot';
    default:
      return undefined;
  }
}

function mapVariantKind(kind?: string): VariantKind {
  const allowed: VariantKind[] = [
    'small', 'medium', 'large', 'half', 'full', 'mini', 'family',
    'regular', '500gm', '1kg', 'custom',
  ];
  return allowed.includes(kind as VariantKind) ? (kind as VariantKind) : 'custom';
}

function mapLabels(
  labels?: readonly { kind: string; displayText: string }[],
): LabelDTO[] {
  if (!labels?.length) return [];
  return labels.map((label) => ({
    schemaVersion: V,
    kind: (label.kind as LabelKind) || 'CUSTOM',
    displayText: label.displayText,
  }));
}

function mapOffer(item: FirestoreMenuItemRecord): OfferDTO | undefined {
  if (!item.offer?.displayText) return undefined;
  return {
    schemaVersion: V,
    offerId: `offer_${item.id}`,
    enabled: true,
    displayText: item.offer.displayText,
    badge: item.offer.badge,
    priority: item.offer.priority ?? 1,
    validity: { schemaVersion: V, recurring: false },
    type: (item.offer.type as OfferDTO['type']) || 'custom',
  };
}

function mapVariants(item: FirestoreMenuItemRecord): VariantDTO[] {
  return (item.variants ?? []).map((variant, index) => {
    const absolute = variant.offerPrice ?? variant.price;
    const delta = absolute - item.price;
    return {
      schemaVersion: V,
      variantId: variant.variantId ?? `var_${item.id}_${index}`,
      kind: mapVariantKind(variant.kind),
      displayName: variant.displayName,
      priceDelta: money(delta),
      absolutePrice: money(absolute),
      availability: availability(item.isAvailable),
      sortOrder: variant.sortOrder ?? index,
      isDefault: index === 0,
    };
  });
}

function mapAddonGroups(item: FirestoreMenuItemRecord): AddonGroupDTO[] {
  return (item.addonGroups ?? []).map((group, groupIndex) => {
    const options: AddonOptionDTO[] = group.options.map((option, index) => ({
      schemaVersion: V,
      optionId: option.optionId ?? `addon_${item.id}_${groupIndex}_${index}`,
      displayName: option.displayName,
      kind: option.kind ?? 'custom',
      pricing: { schemaVersion: V, price: money(option.price) },
      availability: availability(item.isAvailable),
      maxQuantity: option.maxQuantity,
      sortOrder: option.sortOrder ?? index,
    }));
    return {
      schemaVersion: V,
      groupId: group.groupId ?? `group_${item.id}_${groupIndex}`,
      displayName: group.displayName,
      selectionRules: {
        schemaVersion: V,
        required: group.required === true,
        minSelections: group.minSelections ?? 0,
        maxSelections: group.maxSelections ?? options.length,
        allowMultiplePerOption: true,
      },
      sortOrder: groupIndex,
      options,
    };
  });
}

export function mapMenuItemToFoodDTO(
  item: FirestoreMenuItemRecord,
  restaurantId: string,
  displayOrder: number,
): FoodDTO {
  const offer = mapOffer(item);
  const sellingPrice = item.offer?.sellingPrice ?? inferSellingPrice(item);
  const heroUrl = item.image ?? '';

  return {
    schemaVersion: V,
    foodId: item.id,
    slug: slugify(item.name),
    restaurantId,
    categoryId: item.categoryId ?? slugify(item.category),
    name: item.name,
    description: item.description,
    displayOrder,
    media: {
      schemaVersion: V,
      hero: imageFromUrl(heroUrl, `img_${item.id}`, item.name),
      gallery: heroUrl ? [imageFromUrl(heroUrl, `img_${item.id}_g0`, item.name)] : [],
    },
    pricing: {
      schemaVersion: V,
      regularPrice: money(item.price),
      sellingPrice: offer && sellingPrice != null && sellingPrice < item.price ? money(sellingPrice) : undefined,
      taxIncluded: true,
    },
    availability: availability(item.isAvailable),
    labels: mapLabels(item.labels),
    offer,
    variants: mapVariants(item),
    addonGroups: mapAddonGroups(item),
    story: item.chefNote
      ? {
          schemaVersion: V,
          chefNote: item.chefNote,
          ingredients: [...(item.ingredients ?? [])],
          cookingStyle: item.cookingStyle,
          servingSize: item.servingSize,
          popularPairingLabel: item.popularPairing,
          popularPairingFoodIds: [],
        }
      : undefined,
    nutrition: item.nutritionSummary
      ? { schemaVersion: V, summary: item.nutritionSummary }
      : undefined,
    allergens: item.allergenSummary
      ? { schemaVersion: V, summary: item.allergenSummary, tags: [] }
      : undefined,
    metadata: {
      schemaVersion: V,
      dietary: mapDietary(item.type),
      spiceLevel: mapSpice(item.spiceLevel),
      preparationMinutes: item.preparationMinutes,
    },
  };
}

function inferSellingPrice(item: FirestoreMenuItemRecord): number | undefined {
  const variantOffer = item.variants?.find((v) => v.offerPrice != null)?.offerPrice;
  if (variantOffer != null && variantOffer < item.price) return variantOffer;
  return undefined;
}

function buildTheme(tenant: FirestoreTenantRecord): ThemeDTO {
  const theme = tenant.marketplace?.theme;
  const logoUrl = theme?.logoUrl ?? tenant.branding?.logoUrl ?? '';
  return {
    schemaVersion: V,
    logo: imageFromUrl(logoUrl || 'https://cdn.bhojan.app/brand/default-logo.png', `logo_${tenant.slug}`, tenant.name),
    cover: theme?.coverUrl ?? tenant.branding?.coverUrl
      ? imageFromUrl(theme?.coverUrl ?? tenant.branding?.coverUrl ?? '', `cover_${tenant.slug}`)
      : undefined,
    colors: {
      schemaVersion: V,
      primary: theme?.primaryColor ?? '#E85D04',
      secondary: theme?.secondaryColor,
      highlight: theme?.highlightColor,
    },
    brandAssets: [],
  };
}

function countItemsByCategoryKey(items: readonly FirestoreMenuItemRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.categoryId ?? slugify(item.category);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Prefer owner-managed category docs; fall back to deriving rails from menu item strings. */
export function buildProjectedCategories(
  items: readonly FirestoreMenuItemRecord[],
  managedCategories: readonly FirestoreCategoryRecord[] = [],
): CategoryDTO[] {
  const counts = countItemsByCategoryKey(items);
  const activeManaged = managedCategories
    .filter((category) => category.isActive !== false)
    .slice()
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));

  if (activeManaged.length === 0) {
    const derived = new Map<string, { id: string; name: string; count: number }>();
    for (const item of items) {
      const categoryId = item.categoryId ?? slugify(item.category);
      const existing = derived.get(categoryId);
      if (existing) existing.count += 1;
      else derived.set(categoryId, { id: categoryId, name: item.category, count: 1 });
    }
    return [...derived.values()].map((cat, index) => ({
      schemaVersion: V,
      categoryId: cat.id,
      slug: cat.id,
      name: cat.name,
      displayOrder: index,
      visibility: 'visible' as const,
      itemCount: cat.count,
    }));
  }

  const coveredKeys = new Set<string>();
  const fromManaged: CategoryDTO[] = activeManaged.map((category, index) => {
    const slug = slugify(category.name) || category.id;
    coveredKeys.add(category.id);
    coveredKeys.add(slug);
    let itemCount = counts.get(category.id) ?? 0;
    if (slug !== category.id) itemCount += counts.get(slug) ?? 0;
    return {
      schemaVersion: V,
      categoryId: category.id,
      slug,
      name: category.name,
      displayOrder: category.priority ?? index,
      visibility: 'visible' as const,
      itemCount,
      image: category.image
        ? imageFromUrl(category.image, `cat_${category.id}`, category.name)
        : undefined,
    };
  });

  const orphans: CategoryDTO[] = [];
  for (const item of items) {
    const key = item.categoryId ?? slugify(item.category);
    if (coveredKeys.has(key)) continue;
    coveredKeys.add(key);
    orphans.push({
      schemaVersion: V,
      categoryId: key,
      slug: key,
      name: item.category,
      displayOrder: fromManaged.length + orphans.length,
      visibility: 'visible',
      itemCount: counts.get(key) ?? 0,
    });
  }

  return [...fromManaged, ...orphans];
}

export function projectFoodMenuV1(
  tenant: FirestoreTenantRecord,
  items: readonly FirestoreMenuItemRecord[],
  contextToken: string,
  managedCategories: readonly FirestoreCategoryRecord[] = [],
): FoodMenuApiEnvelopeDTO {
  const restaurantId = tenant.marketplace?.publicRestaurantId ?? `obr_${tenant.slug}`;
  const sorted = [...items].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name),
  );

  const categories = buildProjectedCategories(sorted, managedCategories);

  const foodItems = sorted.map((item, index) =>
    mapMenuItemToFoodDTO(item, restaurantId, item.displayOrder ?? index),
  );

  const featuredFoodIds =
    tenant.marketplace?.featuredFoodIds ??
    foodItems.filter((f) => f.labels.some((l) => l.kind === 'CHEF_PICK' || l.kind === 'BESTSELLER')).map((f) => f.foodId);

  const todaysSpecialFoodIds =
    tenant.marketplace?.todaysSpecialFoodIds ??
    foodItems.filter((f) => f.offer).map((f) => f.foodId).slice(0, 3);

  return {
    schemaVersion: V,
    slug: tenant.slug,
    restaurantName: tenant.name,
    theme: buildTheme(tenant),
    categories,
    items: foodItems,
    featuredFoodIds: [...featuredFoodIds],
    todaysSpecialFoodIds: [...todaysSpecialFoodIds],
    contextToken,
  };
}

export function parseFirestoreMenuItem(id: string, data: Record<string, unknown>): FirestoreMenuItemRecord | null {
  const tenantId = typeof data.tenantId === 'string' ? data.tenantId : '';
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const category = typeof data.category === 'string' ? data.category.trim() : '';
  const price = Number(data.price);
  if (!tenantId || !name || !category || !Number.isFinite(price)) return null;

  return {
    id,
    tenantId,
    name,
    category,
    categoryId: typeof data.categoryId === 'string' ? data.categoryId : undefined,
    price,
    type: data.type === 'non-veg' ? 'non-veg' : 'veg',
    description: typeof data.description === 'string' ? data.description : undefined,
    image: typeof data.image === 'string' ? data.image : undefined,
    isAvailable: data.isAvailable !== false,
    labels: Array.isArray(data.labels)
      ? data.labels.filter((entry): entry is { kind: string; displayText: string } =>
          !!entry &&
          typeof entry === 'object' &&
          typeof (entry as { kind?: unknown }).kind === 'string' &&
          typeof (entry as { displayText?: unknown }).displayText === 'string',
        )
      : undefined,
    offer:
      data.offer && typeof data.offer === 'object' && typeof (data.offer as { displayText?: unknown }).displayText === 'string'
        ? {
            displayText: (data.offer as { displayText: string }).displayText,
            badge: typeof (data.offer as { badge?: unknown }).badge === 'string'
              ? (data.offer as { badge: string }).badge
              : undefined,
            type: typeof (data.offer as { type?: unknown }).type === 'string'
              ? (data.offer as { type: string }).type
              : undefined,
            priority: typeof (data.offer as { priority?: unknown }).priority === 'number'
              ? (data.offer as { priority: number }).priority
              : undefined,
            sellingPrice: typeof (data.offer as { sellingPrice?: unknown }).sellingPrice === 'number'
              ? (data.offer as { sellingPrice: number }).sellingPrice
              : undefined,
          }
        : undefined,
    variants: Array.isArray(data.variants) ? (data.variants as FirestoreMenuItemRecord['variants']) : undefined,
    addonGroups: Array.isArray(data.addonGroups)
      ? (data.addonGroups as FirestoreMenuItemRecord['addonGroups'])
      : undefined,
    spiceLevel: typeof data.spiceLevel === 'string' ? data.spiceLevel : undefined,
    preparationMinutes:
      typeof data.preparationMinutes === 'number'
        ? data.preparationMinutes
        : typeof data.preparationTime === 'number'
          ? data.preparationTime
          : undefined,
    chefNote: typeof data.chefNote === 'string' ? data.chefNote : undefined,
    ingredients: Array.isArray(data.ingredients)
      ? data.ingredients.filter((v): v is string => typeof v === 'string')
      : undefined,
    cookingStyle: typeof data.cookingStyle === 'string' ? data.cookingStyle : undefined,
    servingSize: typeof data.servingSize === 'string' ? data.servingSize : undefined,
    popularPairing: typeof data.popularPairing === 'string' ? data.popularPairing : undefined,
    nutritionSummary: typeof data.nutritionSummary === 'string' ? data.nutritionSummary : undefined,
    allergenSummary: typeof data.allergenSummary === 'string' ? data.allergenSummary : undefined,
    displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : undefined,
  };
}

export function parseFirestoreTenant(id: string, data: Record<string, unknown>): FirestoreTenantRecord {
  const slug = typeof data.slug === 'string' ? data.slug : id;
  const name = typeof data.name === 'string' ? data.name : slug;
  const branding =
    data.branding && typeof data.branding === 'object'
      ? (data.branding as FirestoreTenantRecord['branding'])
      : undefined;
  const storeOperations =
    data.storeOperations && typeof data.storeOperations === 'object'
      ? (data.storeOperations as FirestoreTenantRecord['storeOperations'])
      : undefined;
  const deliveryConfig =
    data.deliveryConfig && typeof data.deliveryConfig === 'object'
      ? (data.deliveryConfig as FirestoreTenantRecord['deliveryConfig'])
      : undefined;
  const locationRaw = data.location && typeof data.location === 'object' ? data.location : undefined;
  const location =
    locationRaw &&
    Number.isFinite((locationRaw as { lat?: unknown }).lat) &&
    Number.isFinite((locationRaw as { lng?: unknown }).lng)
      ? {
          lat: Number((locationRaw as { lat: number }).lat),
          lng: Number((locationRaw as { lng: number }).lng),
          city:
            typeof (locationRaw as { city?: unknown }).city === 'string'
              ? (locationRaw as { city: string }).city
              : undefined,
          state:
            typeof (locationRaw as { state?: unknown }).state === 'string'
              ? (locationRaw as { state: string }).state
              : undefined,
          address:
            typeof (locationRaw as { address?: unknown }).address === 'string'
              ? (locationRaw as { address: string }).address
              : undefined,
          pincode:
            typeof (locationRaw as { pincode?: unknown }).pincode === 'string'
              ? (locationRaw as { pincode: string }).pincode
              : undefined,
        }
      : undefined;

  return {
    id,
    slug,
    name,
    marketplace: parseTenantMarketplace(data.marketplace),
    branding,
    storeOperations,
    deliveryConfig,
    location,
    businessType: typeof data.businessType === 'string' ? data.businessType : undefined,
    description: typeof data.description === 'string' ? data.description : undefined,
    cuisineTags: Array.isArray(data.cuisineTags)
      ? data.cuisineTags.filter((v): v is string => typeof v === 'string')
      : undefined,
  };
}

export function createMarketplaceContextToken(): string {
  return randomUUID();
}
