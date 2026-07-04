export type DietaryType = 'veg' | 'nonVeg' | 'egg';

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
  readonly bestSeller?: boolean;
  readonly recommended?: boolean;
  readonly chefSpecial?: boolean;
  readonly newItem?: boolean;
  readonly variants: readonly FoodVariant[];
  readonly addons: readonly FoodAddon[];
  readonly nutritionSummary?: string;
  readonly allergenSummary?: string;
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
