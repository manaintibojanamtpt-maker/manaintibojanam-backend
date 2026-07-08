export type FoodCategoryId =
  | 'pizza'
  | 'biryani'
  | 'meals'
  | 'south-indian'
  | 'north-indian'
  | 'chinese'
  | 'fast-food'
  | 'desserts'
  | 'juices';

export interface FoodCategory {
  readonly id: FoodCategoryId;
  readonly label: string;
  readonly emoji: string;
}

export interface HeroBannerSlide {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly cta: string;
  readonly gradient: string;
  readonly imageUrl: string;
}

export interface MockRestaurant {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly cuisine: string;
  readonly rating: number;
  readonly eta: string;
  readonly deliveryFee: string;
  readonly distance: string;
  readonly imageUrl: string;
  readonly logoUrl: string;
  readonly categoryIds: readonly FoodCategoryId[];
  readonly offer?: string;
  readonly isVeg: boolean;
  readonly isCloudKitchen: boolean;
  readonly isOpen: boolean;
  readonly isFavorite: boolean;
}

export interface MockFoodItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly oldPrice?: number;
  readonly isVeg: boolean;
  readonly imageUrl: string;
  readonly categoryIds: readonly FoodCategoryId[];
  readonly restaurantSlug: string;
  readonly restaurantId?: string;
}

export interface MockSearchTerm {
  readonly id: string;
  readonly label: string;
}

export type ExperienceSectionId =
  | 'featured'
  | 'nearby'
  | 'top-rated'
  | 'cloud-kitchens'
  | 'recently-ordered';

export function getTimeGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 22) return 'Good Evening';
  return 'Good Night';
}
