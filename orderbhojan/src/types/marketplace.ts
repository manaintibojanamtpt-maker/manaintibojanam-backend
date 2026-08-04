export type RestaurantBadge =
  | 'veg'
  | 'pure_veg'
  | 'cloud_kitchen'
  | 'new'
  | 'offer'
  | 'non_veg';

export type KitchenFormat = 'cloud_kitchen' | 'restaurant' | 'chef_kitchen' | 'home_kitchen';

export interface RestaurantPublic {
  readonly restaurantId: string;
  readonly restaurantSlug: string;
  readonly displayName: string;
  readonly logoUrl?: string;
  readonly coverUrl?: string;
  readonly rating?: number;
  readonly ratingCount?: number;
  readonly cuisines: readonly string[];
  readonly priceForTwo?: number;
  readonly distanceKm?: number;
  readonly etaMinutes?: { readonly min: number; readonly max: number };
  readonly deliveryFee?: number | null;
  readonly isOpen: boolean;
  readonly badges: readonly RestaurantBadge[];
  readonly kitchenFormat: KitchenFormat;
  /** Primary active offer label for customer badges — owner-authored */
  readonly offer?: string;
}

export interface BillQuote {
  readonly subtotal: number;
  readonly gstAmount: number;
  readonly gstPercent: number;
  readonly packagingFee: number;
  readonly deliveryFee: number;
  readonly deliveryPending: boolean;
  readonly discountAmount: number;
  readonly grandTotal: number;
  readonly taxLabel: string;
  readonly lineItems: readonly { readonly label: string; readonly amount: number }[];
}

export interface CheckoutSchedulingContext {
  readonly isStoreOpen: boolean;
  readonly storeTiming: {
    readonly openTime: string;
    readonly closeTime: string;
    readonly businessHoursEnabled: boolean;
    readonly offlineMessage?: string;
  };
  readonly prepMinutes: number;
  readonly deliverySlots: readonly string[];
  readonly closedMessage?: string;
}

export interface CheckoutPrepareResponse {
  readonly paymentMethods: readonly string[];
  readonly quote: BillQuote;
  readonly scheduling?: CheckoutSchedulingContext;
}

export interface ApiMeta {
  readonly correlationId: string;
  readonly cached?: boolean;
  readonly tenantSyncRevision?: string;
}

export interface ApiSuccess<T> {
  readonly ok: true;
  readonly value: T;
  readonly meta?: ApiMeta;
}

export interface ApiErrorBody {
  readonly code: string;
  readonly message: string;
  readonly retryable?: boolean;
}

export interface ApiFailure {
  readonly ok: false;
  readonly error: ApiErrorBody;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export interface DiscoverRail {
  readonly id: string;
  readonly title: string;
  readonly restaurants: readonly RestaurantPublic[];
}

export interface DiscoverResponse {
  readonly locationLabel?: string;
  readonly rails: readonly DiscoverRail[];
}

export interface SearchHit {
  readonly type: 'restaurant' | 'cuisine' | 'dish';
  readonly restaurant?: RestaurantPublic;
  readonly label: string;
  readonly subtitle?: string;
}

export interface SearchResponse {
  readonly hits: readonly SearchHit[];
  readonly meta: { readonly provider: string };
}

export interface RestaurantDetailResponse {
  readonly restaurant: RestaurantPublic;
  readonly contextToken: string;
  readonly description?: string;
  readonly hours?: readonly { readonly day: string; readonly open: string; readonly close: string }[];
  readonly offers?: readonly { readonly id: string; readonly title: string; readonly description?: string }[];
  readonly serviceability: {
    readonly delivery: boolean;
    readonly pickup: boolean;
    readonly message?: string;
  };
}

export interface MenuCategory {
  readonly id: string;
  readonly name: string;
  readonly items: readonly MenuItem[];
}

export interface MenuItem {
  readonly itemId: string;
  readonly name: string;
  readonly description?: string;
  readonly price: number;
  readonly isVeg: boolean;
  readonly imageUrl?: string;
  readonly available: boolean;
}

export interface MenuResponse {
  readonly categories: readonly MenuCategory[];
}

export interface OrderSummary {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly restaurantId: string;
  readonly displayName: string;
  readonly status: string;
  readonly paymentStatus?: string;
  readonly grandTotal: number;
  readonly createdAt: string;
  readonly expiresAt?: string;
}

export interface OrderTrackingResponse {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly status: string;
  readonly paymentStatus?: string;
  readonly expiresAt?: string;
  readonly timeline: readonly { readonly status: string; readonly at: string; readonly message?: string }[];
  readonly etaMinutes?: { readonly min: number; readonly max: number };
  readonly restaurant?: {
    readonly displayName: string;
    readonly slug: string;
    readonly restaurantId: string;
  };
  readonly delivery?: {
    readonly partner?: string;
    readonly trackingUrl?: string;
    readonly riderName?: string;
    readonly riderPhone?: string;
  };
  readonly invoice?: {
    readonly orderNumber: string;
    readonly createdAt: string;
    readonly kitchenName: string;
    readonly customerName?: string;
    readonly phone?: string;
    readonly address?: string;
    readonly paymentMethod?: string;
    readonly paymentStatus?: string;
    readonly items: readonly {
      readonly itemId: string;
      readonly name: string;
      readonly quantity: number;
      readonly unitPrice: number;
    }[];
    readonly subtotal: number;
    readonly gstAmount: number;
    readonly gstPercent?: number;
    readonly deliveryFee: number;
    readonly packingFee: number;
    readonly discountAmount?: number;
    readonly grandTotal: number;
  };
  readonly feedback?: {
    readonly eligible: boolean;
    readonly submitted: boolean;
    readonly rating?: number;
    readonly comment?: string;
  };
  readonly reorder?: {
    readonly restaurantSlug: string;
    readonly restaurantId: string;
    readonly items: readonly {
      readonly itemId: string;
      readonly name: string;
      readonly quantity: number;
      readonly unitPrice: number;
    }[];
  };
}

export interface CustomerProfile {
  readonly uid: string;
  readonly displayName?: string;
  readonly phone?: string;
  readonly email?: string;
}

export interface MarketplaceHealth {
  readonly status: 'ok';
  readonly version: string;
  readonly environment: string;
}
