export type MenuItemDietary = 'veg' | 'nonVeg' | 'egg';

export interface MenuItemBadge {
  readonly text: string;
  readonly tone: 'trending' | 'offer' | 'default';
}

export interface MenuItemCardViewModel {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly priceLabel: string;
  readonly imageUrl: string;
  readonly imageAlt: string;
  readonly dietary: MenuItemDietary;
  readonly ratingLabel?: string;
  readonly badges: readonly MenuItemBadge[];
  readonly metaLabels: readonly string[];
  readonly unavailable?: boolean;
}

export interface FeaturedMenuItemCardViewModel extends MenuItemCardViewModel {
  readonly subtitle?: string;
}

export interface CustomizationOptionViewModel {
  readonly id: string;
  readonly label: string;
  readonly priceLabel?: string;
  readonly selected: boolean;
}

export interface FoodCustomizationStoryViewModel {
  readonly chefNote?: string;
  readonly cookingStyle?: string;
  readonly servingSize?: string;
  readonly popularPairing?: string;
  readonly ingredients?: readonly string[];
  readonly dietaryLabels?: readonly string[];
}

export interface FoodCustomizationPanelViewModel {
  readonly heroBlurUrl?: string;
  readonly story?: FoodCustomizationStoryViewModel;
  readonly variantOptions: readonly CustomizationOptionViewModel[];
  readonly variantMode: 'segment' | 'list';
  readonly variantSectionTitle: string;
  readonly showVariantSection: boolean;
  readonly addonOptions: readonly CustomizationOptionViewModel[];
  readonly addonSectionTitle: string;
  readonly showAddonSection: boolean;
  readonly quantity: number;
  readonly quantityAriaLabel: string;
  readonly spiceNote?: string;
  readonly instructions: string;
  readonly instructionsPlaceholder: string;
  readonly unitPriceSummary: string;
  readonly lineTotalLabel: string;
  readonly confirmLabel: string;
}
