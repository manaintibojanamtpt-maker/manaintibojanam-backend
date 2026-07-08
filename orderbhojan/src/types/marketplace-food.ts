export type DietaryType = 'veg' | 'nonVeg' | 'egg';

export type SpiceLevel = 'mild' | 'medium' | 'hot' | 'extraHot';

export type FoodVariantKind =
  | 'small'
  | 'medium'
  | 'large'
  | 'half'
  | 'full'
  | '500gm'
  | '1kg'
  | 'custom';

export interface FoodVariant {
  readonly id: string;
  readonly kind: FoodVariantKind;
  readonly label: string;
  readonly price: number;
  readonly offerPrice?: number;
}

export interface FoodAddon {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly price: number;
  readonly maxQuantity?: number;
}

export type FoodLabelKind =
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

export interface FoodOwnerLabel {
  readonly kind: FoodLabelKind;
  readonly displayText: string;
}

export interface FoodPublic {
  readonly foodId: string;
  readonly slug: string;
  readonly name: string;
  readonly description?: string;
  readonly image?: string;
  readonly price: number;
  readonly offerPrice?: number;
  readonly currency: string;
  readonly category: string;
  readonly categoryId: string;
  readonly rating?: number;
  readonly dietary: DietaryType;
  readonly preparationTime?: number;
  readonly availability: boolean;
  /** @deprecated Use ownerLabels from contract v1 */
  readonly bestSeller?: boolean;
  /** @deprecated Use ownerLabels from contract v1 */
  readonly recommended?: boolean;
  /** @deprecated Use ownerLabels from contract v1 */
  readonly chefSpecial?: boolean;
  /** @deprecated Use ownerLabels from contract v1 */
  readonly newItem?: boolean;
  /** Owner-authored labels (Marketplace v1 projection) */
  readonly ownerLabels?: readonly FoodOwnerLabel[];
  /** Owner-authored offer copy — never renderer-computed */
  readonly ownerOfferDisplayText?: string;
  /** True when item was adapted from FoodDTO v1 */
  readonly contractSource?: boolean;
  readonly variants: readonly FoodVariant[];
  readonly addons: readonly FoodAddon[];
  readonly nutritionSummary?: string;
  readonly allergenSummary?: string;
  readonly chefNote?: string;
  readonly ingredients?: readonly string[];
  readonly cookingStyle?: string;
  readonly servingSize?: string;
  readonly popularPairing?: string;
  readonly spiceLevel?: SpiceLevel;
  readonly dietaryLabels?: readonly string[];
}

export interface FoodCategoryPublic {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly itemCount: number;
}

export interface FoodMenuResponse {
  readonly slug: string;
  readonly restaurantName?: string;
  readonly categories: readonly FoodCategoryPublic[];
  readonly items: readonly FoodPublic[];
  readonly featuredIds: readonly string[];
  readonly todaysSpecialIds: readonly string[];
}

export interface FoodCategoriesResponse {
  readonly slug: string;
  readonly categories: readonly FoodCategoryPublic[];
}

export interface FoodCollectionResponse {
  readonly slug: string;
  readonly items: readonly FoodPublic[];
}

export interface FoodMenuQueryParams {
  readonly slug: string;
  readonly lat?: number;
  readonly lng?: number;
}

/** Internal — never expose contextToken to UI components. */
export interface FoodMenuApiPayload extends FoodMenuResponse {
  readonly contextToken: string;
}
