/** Caller-owned personalization snapshot — never fetched inside the assistant domain. */

export interface PersonalizationReorderItem {
  readonly itemId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

export interface PersonalizationReorderSource {
  readonly restaurantId: string;
  readonly restaurantSlug: string;
  readonly orderId?: string;
  readonly orderNumber?: string;
  readonly items: readonly PersonalizationReorderItem[];
}

export interface PersonalizationFavoriteRestaurant {
  readonly id: string;
  readonly slug: string;
  readonly displayName: string;
}

export interface PersonalizationRecentOrder {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly restaurantId: string;
  readonly displayName: string;
  readonly status: string;
}

export interface PersonalizationBootstrap {
  readonly reorder?: PersonalizationReorderSource;
  readonly favoriteRestaurants?: readonly PersonalizationFavoriteRestaurant[];
  readonly recentOrders?: readonly PersonalizationRecentOrder[];
  readonly activeRestaurantId?: string;
}
