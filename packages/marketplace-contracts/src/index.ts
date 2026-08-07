export const CONTRACT_SCHEMA_VERSION = '1.0' as const;
export type SchemaVersion = typeof CONTRACT_SCHEMA_VERSION;

export interface ImageDTO {
  readonly schemaVersion: SchemaVersion;
  readonly assetId: string;
  readonly url: string;
  readonly width?: number;
  readonly height?: number;
  readonly blurHash?: string;
  readonly alt?: string;
}

export interface MoneyDTO {
  readonly schemaVersion: SchemaVersion;
  readonly amount: number;
  readonly currency: string;
}

export type BadgeKind =
  | 'pure_veg'
  | 'veg_friendly'
  | 'cloud_kitchen'
  | 'halal'
  | 'jain'
  | 'fssai_verified'
  | 'new'
  | 'custom';

export interface BadgeDTO {
  readonly schemaVersion: SchemaVersion;
  readonly kind: BadgeKind;
  readonly displayText: string;
}

export type LabelKind =
  | 'BESTSELLER'
  | 'CHEF_PICK'
  | 'NEW'
  | 'LIMITED'
  | 'FESTIVAL'
  | 'HEALTHY'
  | 'KIDS'
  | 'POPULAR'
  | 'SPICY'
  | 'PROTEIN'
  | 'SEASONAL'
  | 'CUSTOM';

export interface LabelDTO {
  readonly schemaVersion: SchemaVersion;
  readonly kind: LabelKind;
  readonly displayText: string;
}

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface EtaRangeDTO {
  readonly schemaVersion: SchemaVersion;
  readonly min: number;
  readonly max: number;
}

export type OperationalStatus =
  | 'open'
  | 'closing_soon'
  | 'closed'
  | 'paused'
  | 'vacation'
  | 'emergency_closed';

export type OfferType =
  | 'percentage'
  | 'flat_amount'
  | 'bogo'
  | 'free_delivery'
  | 'free_item'
  | 'bundle'
  | 'festival'
  | 'custom';

export interface OfferValidityDTO {
  readonly schemaVersion: SchemaVersion;
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly recurring: boolean;
}

export interface OfferDTO {
  readonly schemaVersion: SchemaVersion;
  readonly offerId: string;
  readonly enabled: true;
  readonly displayText: string;
  readonly badge?: string;
  readonly description?: string;
  readonly priority: number;
  readonly validity: OfferValidityDTO;
  readonly type: OfferType;
}

export interface ThemeColorsDTO {
  readonly schemaVersion: SchemaVersion;
  readonly primary?: string;
  readonly secondary?: string;
  readonly highlight?: string;
}

export interface BrandAssetDTO {
  readonly schemaVersion: SchemaVersion;
  readonly kind: 'logo' | 'cover' | 'icon_mark' | 'watermark' | 'custom';
  readonly image: ImageDTO;
}

export interface ThemeDTO {
  readonly schemaVersion: SchemaVersion;
  readonly logo: ImageDTO;
  readonly cover?: ImageDTO;
  readonly colors: ThemeColorsDTO;
  readonly brandAssets: readonly BrandAssetDTO[];
}

export interface GalleryDTO {
  readonly schemaVersion: SchemaVersion;
  readonly galleryId: string;
  readonly image: ImageDTO;
  readonly caption?: string;
  readonly sortOrder: number;
}

export type CategoryVisibility = 'visible' | 'hidden' | 'scheduled';

export interface CategoryScheduleDTO {
  readonly schemaVersion: SchemaVersion;
  readonly daysOfWeek: readonly DayOfWeek[];
  readonly startTime: string;
  readonly endTime: string;
  readonly festivalTag?: string;
}

export interface CategoryDTO {
  readonly schemaVersion: SchemaVersion;
  readonly categoryId: string;
  readonly slug: string;
  readonly name: string;
  readonly image?: ImageDTO;
  readonly icon?: string;
  readonly displayOrder: number;
  readonly visibility: CategoryVisibility;
  readonly schedule?: CategoryScheduleDTO;
  readonly itemCount: number;
  readonly parentCategoryId?: string;
}

export type VariantKind =
  | 'small'
  | 'medium'
  | 'large'
  | 'half'
  | 'full'
  | 'mini'
  | 'family'
  | 'regular'
  | '500gm'
  | '1kg'
  | 'custom';

export type FoodAvailabilityStatus =
  | 'available'
  | 'out_of_stock'
  | 'limited'
  | 'preorder'
  | 'today_only'
  | 'time_based'
  | 'hidden';

export interface FoodAvailabilityDTO {
  readonly schemaVersion: SchemaVersion;
  readonly status: FoodAvailabilityStatus;
  readonly consumerMessage?: string;
}

export interface VariantDTO {
  readonly schemaVersion: SchemaVersion;
  readonly variantId: string;
  readonly kind: VariantKind;
  readonly displayName: string;
  readonly priceDelta: MoneyDTO;
  readonly absolutePrice?: MoneyDTO;
  readonly availability: FoodAvailabilityDTO;
  readonly sortOrder: number;
  readonly isDefault: boolean;
}

export interface AddonSelectionRulesDTO {
  readonly schemaVersion: SchemaVersion;
  readonly required: boolean;
  readonly minSelections: number;
  readonly maxSelections: number;
  readonly allowMultiplePerOption: boolean;
}

export interface AddonPricingDTO {
  readonly schemaVersion: SchemaVersion;
  readonly price: MoneyDTO;
}

export interface AddonOptionDTO {
  readonly schemaVersion: SchemaVersion;
  readonly optionId: string;
  readonly displayName: string;
  readonly kind: string;
  readonly pricing: AddonPricingDTO;
  readonly availability: FoodAvailabilityDTO;
  readonly maxQuantity?: number;
  readonly sortOrder: number;
}

export interface AddonGroupDTO {
  readonly schemaVersion: SchemaVersion;
  readonly groupId: string;
  readonly displayName: string;
  readonly selectionRules: AddonSelectionRulesDTO;
  readonly sortOrder: number;
  readonly options: readonly AddonOptionDTO[];
}

export type DietaryClassification = 'veg' | 'non_veg' | 'egg' | 'vegan' | 'jain' | 'halal';

export type SpiceLevel = 'none' | 'mild' | 'medium' | 'hot' | 'extra_hot';

export interface FoodMediaDTO {
  readonly schemaVersion: SchemaVersion;
  readonly hero: ImageDTO;
  readonly gallery: readonly ImageDTO[];
}

export interface FoodPricingDTO {
  readonly schemaVersion: SchemaVersion;
  readonly regularPrice: MoneyDTO;
  readonly sellingPrice?: MoneyDTO;
  readonly mrp?: MoneyDTO;
  readonly taxIncluded: boolean;
}

export interface FoodStoryDTO {
  readonly schemaVersion: SchemaVersion;
  readonly chefNote?: string;
  readonly ingredients: readonly string[];
  readonly cookingStyle?: string;
  readonly servingSize?: string;
  readonly popularPairingLabel?: string;
  readonly popularPairingFoodIds: readonly string[];
}

export interface FoodNutritionDTO {
  readonly schemaVersion: SchemaVersion;
  readonly summary?: string;
  readonly caloriesKcal?: number;
}

export interface FoodAllergensDTO {
  readonly schemaVersion: SchemaVersion;
  readonly summary?: string;
  readonly tags: readonly string[];
}

export interface FoodMetadataDTO {
  readonly schemaVersion: SchemaVersion;
  readonly dietary: DietaryClassification;
  readonly spiceLevel?: SpiceLevel;
  readonly preparationMinutes?: number;
  readonly rating?: number;
}

export interface FoodDTO {
  readonly schemaVersion: SchemaVersion;
  readonly foodId: string;
  readonly slug: string;
  readonly restaurantId: string;
  readonly categoryId: string;
  readonly name: string;
  readonly subtitle?: string;
  readonly description?: string;
  readonly displayOrder: number;
  readonly media: FoodMediaDTO;
  readonly pricing: FoodPricingDTO;
  readonly availability: FoodAvailabilityDTO;
  readonly labels: readonly LabelDTO[];
  readonly offer?: OfferDTO;
  readonly variants: readonly VariantDTO[];
  readonly addonGroups: readonly AddonGroupDTO[];
  readonly story?: FoodStoryDTO;
  readonly nutrition?: FoodNutritionDTO;
  readonly allergens?: FoodAllergensDTO;
  readonly metadata: FoodMetadataDTO;
}

export interface FoodMenuDTO {
  readonly schemaVersion: SchemaVersion;
  readonly slug: string;
  readonly restaurantName: string;
  readonly theme: ThemeDTO;
  readonly categories: readonly CategoryDTO[];
  readonly items: readonly FoodDTO[];
  readonly featuredFoodIds: readonly string[];
  readonly todaysSpecialFoodIds: readonly string[];
}

export interface FoodMenuApiEnvelopeDTO extends FoodMenuDTO {
  readonly contextToken: string;
  readonly paymentMethods?: readonly string[];
}

export interface MarketplaceErrorDTO {
  readonly schemaVersion: SchemaVersion;
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly correlationId?: string;
}
