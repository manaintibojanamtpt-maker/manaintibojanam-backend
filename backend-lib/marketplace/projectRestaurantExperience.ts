import type { FirestoreTenantRecord } from './projectFoodMenuV1.js';
import {
  buildWeeklyHours,
  formatHoursLabel,
  isImplausibleCustomerDistance,
  isStoreOpenNow,
  isVegKitchen,
  kitchenDietaryToBadges,
  resolveDeliveryFeeForDisplay,
  resolveKitchenDietaryFromMenuTypes,
  resolveStoreTiming,
  roadDistanceKm,
  shouldShowKitchenDietaryBadge,
  type KitchenDietaryProfile,
} from './tenantProjectionHelpers.js';

export interface RestaurantExperiencePayload {
  readonly experience: {
    readonly restaurantId: string;
    readonly slug: string;
    readonly displayName: string;
    readonly coverImage?: string;
    readonly logo?: string;
    readonly rating?: number;
    readonly ratingCount?: number;
    readonly deliveryFee?: number | null;
    readonly deliveryFeeKnown?: boolean;
    readonly distance?: number;
    readonly eta?: { readonly min: number; readonly max: number };
    readonly cuisines: readonly string[];
    readonly priceRange?: string;
    readonly veg: boolean;
    readonly kitchenDietary?: KitchenDietaryProfile;
    readonly cloudKitchen: boolean;
    readonly openStatus: 'open' | 'closed' | 'closing_soon';
    readonly todayHours?: string;
    readonly gallery: readonly { readonly id: string; readonly url: string; readonly caption?: string }[];
    readonly description?: string;
    readonly offers: readonly {
      readonly id: string;
      readonly title: string;
      readonly description?: string;
      readonly badge?: string;
    }[];
    readonly badges: readonly string[];
    readonly subscriptionEnabled?: boolean;
  };
  readonly contextToken: string;
  readonly hours: readonly {
    readonly day: string;
    readonly open: string;
    readonly close: string;
    readonly isToday?: boolean;
  }[];
  readonly serviceability: {
    readonly delivery: boolean;
    readonly pickup: boolean;
    readonly message?: string;
  };
  readonly policies: readonly { readonly id: string; readonly title: string; readonly body: string }[];
  readonly highlights: readonly { readonly id: string; readonly title: string; readonly subtitle?: string }[];
}

export interface RestaurantExperienceProjectionInput {
  readonly tenant: FirestoreTenantRecord;
  readonly raw: Record<string, unknown>;
  readonly contextToken: string;
  readonly customerCoords?: { readonly lat: number; readonly lng: number };
  readonly menuTypes?: readonly ('veg' | 'non-veg')[];
}

function formatPriceRange(priceForTwo?: number): string | undefined {
  if (priceForTwo == null) return undefined;
  if (priceForTwo < 300) return '₹';
  if (priceForTwo < 500) return '₹₹';
  if (priceForTwo < 800) return '₹₹₹';
  return '₹₹₹₹';
}

function resolveKitchenDietary(
  tenant: FirestoreTenantRecord,
  menuTypes?: readonly ('veg' | 'non-veg')[],
): KitchenDietaryProfile {
  const cuisines = tenant.marketplace?.cuisineTags ?? tenant.cuisineTags ?? [];
  if (cuisines.some((c) => /pure veg|pure_veg/i.test(c))) return 'pure_veg';
  if (menuTypes?.length) return resolveKitchenDietaryFromMenuTypes(menuTypes);
  if (tenant.businessType === 'pure_veg_cloud_kitchen') return 'pure_veg';
  return 'unknown';
}

export function projectRestaurantExperience(
  input: RestaurantExperienceProjectionInput,
): RestaurantExperiencePayload {
  const { tenant, raw, contextToken, customerCoords, menuTypes } = input;
  const mp = tenant.marketplace;
  const timing = resolveStoreTiming(tenant, raw);
  const storeOpen = isStoreOpenNow(timing);
  const restaurantId = mp?.publicRestaurantId ?? `obr_${tenant.slug}`;
  const cuisines = mp?.cuisineTags ?? tenant.cuisineTags ?? [];
  const kitchenDietary = resolveKitchenDietary(tenant, menuTypes);
  const dietaryBadges = kitchenDietaryToBadges(kitchenDietary);

  const gallery =
    mp?.gallery?.map((item) => ({
      id: item.galleryId,
      url: item.url,
      caption: item.caption,
    })) ?? [];
  const offers =
    mp?.offers?.map((offer) => ({
      id: offer.offerId,
      title: offer.displayText,
      description: offer.description,
      badge: offer.badge,
    })) ?? [];

  const weeklyHours =
    mp?.businessHours?.weeklyHours?.map((entry) => ({
      day: entry.day,
      open: entry.open,
      close: entry.close,
      isToday: entry.isToday,
    })) ?? buildWeeklyHours(timing);

  const todayHours =
    mp?.businessHours?.todayHoursLabel ??
    (timing.businessHoursEnabled
      ? formatHoursLabel(timing.openTime, timing.closeTime)
      : storeOpen
        ? 'Open now'
        : timing.offlineMessage || 'Closed today');

  let distance: number | undefined;
  let eta: { min: number; max: number } | undefined;
  let deliveryFee: number | null | undefined;
  let deliveryFeeKnown = false;
  let delivery = storeOpen && tenant.deliveryConfig?.enabled !== false;
  let serviceabilityMessage = storeOpen
    ? 'Delivery available to your location'
    : timing.offlineMessage || 'Currently closed for delivery';

  if (tenant.location && customerCoords) {
    const distanceKm = roadDistanceKm(
      customerCoords.lat,
      customerCoords.lng,
      tenant.location.lat,
      tenant.location.lng,
    );

    if (!isImplausibleCustomerDistance(distanceKm)) {
      distance = Math.round(distanceKm * 10) / 10;
      const prepTime = tenant.deliveryConfig?.prepTime ?? 30;
      eta = { min: prepTime, max: prepTime + 10 };

      const resolvedFee = resolveDeliveryFeeForDisplay(tenant.deliveryConfig, distanceKm);
      if (resolvedFee === undefined) {
        deliveryFeeKnown = false;
        deliveryFee = undefined;
      } else if (resolvedFee === null) {
        deliveryFeeKnown = true;
        deliveryFee = null;
        delivery = false;
        const maxRadius = tenant.deliveryConfig?.maxRadius ?? tenant.deliveryConfig?.paidRadius;
        serviceabilityMessage =
          maxRadius != null
            ? `Outside delivery area (${maxRadius} km radius)`
            : 'Outside delivery area for your location';
      } else {
        deliveryFeeKnown = true;
        deliveryFee = resolvedFee;
      }
    } else if (tenant.location.city) {
      serviceabilityMessage = `Kitchen located in ${tenant.location.city}`;
    }
  }

  const offerBadges = offers.length > 0 ? ['offer'] : [];
  const features =
    typeof raw.features === 'object' && raw.features !== null && !Array.isArray(raw.features)
      ? (raw.features as { subscriptionEnabled?: unknown })
      : undefined;
  const subscriptionEnabled = features?.subscriptionEnabled === true;

  return {
    experience: {
      restaurantId,
      slug: tenant.slug,
      displayName: tenant.name,
      coverImage: mp?.theme?.coverUrl ?? tenant.branding?.coverUrl ?? gallery[0]?.url,
      logo: mp?.theme?.logoUrl ?? tenant.branding?.logoUrl,
      rating: mp?.rating,
      ratingCount: mp?.ratingCount,
      deliveryFee,
      deliveryFeeKnown,
      distance,
      eta,
      cuisines,
      priceRange: mp?.priceBandLabel ?? formatPriceRange(mp?.priceForTwo),
      veg: isVegKitchen(kitchenDietary),
      kitchenDietary: shouldShowKitchenDietaryBadge(kitchenDietary) ? kitchenDietary : undefined,
      cloudKitchen: tenant.businessType === 'cloud_kitchen',
      openStatus: storeOpen ? 'open' : 'closed',
      todayHours,
      gallery,
      description: mp?.description ?? mp?.tagline ?? tenant.description,
      offers,
      badges: [...dietaryBadges, ...offerBadges],
      subscriptionEnabled,
    },
    contextToken,
    hours: weeklyHours,
    serviceability: {
      delivery,
      pickup: true,
      message: serviceabilityMessage,
    },
    policies: mp?.policies ?? [],
    highlights: mp?.highlights ?? [],
  };
}
