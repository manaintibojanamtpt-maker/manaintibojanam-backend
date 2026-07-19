import type { RestaurantPublic } from '@/types/marketplace';
import type { HomeHeroConfig, HomeHeroSlide } from '@/types/marketplace-home-hero';

const MAX_HERO_SLIDES = 6;
const DEFAULT_MAX_OFFER_SLIDES = 2;

function resolveOfferBadgeLabel(restaurant: RestaurantPublic): string | undefined {
  const label = restaurant.offer?.trim();
  if (label) return label;
  if (restaurant.badges.includes('offer')) return 'Offer';
  return undefined;
}

export function isOfferHeroSlide(slide: HomeHeroSlide): boolean {
  return slide.kind === 'offer' || Boolean(slide.offerBadge);
}

export function restaurantToHeroOfferSlide(restaurant: RestaurantPublic): HomeHeroSlide | null {
  const offerBadge = resolveOfferBadgeLabel(restaurant);
  if (!offerBadge) return null;

  return {
    id: `offer-${restaurant.restaurantSlug}`,
    kind: 'offer',
    headline: offerBadge,
    subline: `From ${restaurant.displayName}`,
    imageAlt: `${restaurant.displayName} — ${offerBadge}`,
    imageUrl: restaurant.coverUrl,
    offerBadge,
    restaurantName: restaurant.displayName,
    restaurantSlug: restaurant.restaurantSlug,
    cta: 'Order now',
    ctaPath: `/restaurant/${restaurant.restaurantSlug}`,
  };
}

export function discoveryRestaurantsToHeroOfferSlides(
  restaurants: readonly RestaurantPublic[],
  maxSlides: number,
): HomeHeroSlide[] {
  const seen = new Set<string>();
  const slides: HomeHeroSlide[] = [];

  for (const restaurant of restaurants) {
    if (slides.length >= maxSlides) break;
    const key = restaurant.restaurantSlug || restaurant.restaurantId;
    if (!key || seen.has(key)) continue;
    const slide = restaurantToHeroOfferSlide(restaurant);
    if (!slide) continue;
    seen.add(key);
    slides.push(slide);
  }

  return slides;
}

function interleaveHeroSlides(
  foodSlides: readonly HomeHeroSlide[],
  offerSlides: readonly HomeHeroSlide[],
  maxSlides: number,
): HomeHeroSlide[] {
  const merged: HomeHeroSlide[] = [];
  let foodIndex = 0;
  let offerIndex = 0;

  while (merged.length < maxSlides && (foodIndex < foodSlides.length || offerIndex < offerSlides.length)) {
    if (foodIndex < foodSlides.length) {
      merged.push(foodSlides[foodIndex]);
      foodIndex += 1;
      if (merged.length >= maxSlides) break;
    }
    if (offerIndex < offerSlides.length && merged.length < maxSlides) {
      merged.push(offerSlides[offerIndex]);
      offerIndex += 1;
    }
  }

  while (foodIndex < foodSlides.length && merged.length < maxSlides) {
    merged.push(foodSlides[foodIndex]);
    foodIndex += 1;
  }

  return merged;
}

export function mergeHomeHeroSlides(
  config: HomeHeroConfig,
  discoveryOfferRestaurants: readonly RestaurantPublic[] = [],
): HomeHeroSlide[] {
  const configuredSlides = config.slides.filter((slide) => slide.subline?.trim() && slide.imageAlt?.trim());
  const configuredFoodSlides = configuredSlides.filter((slide) => !isOfferHeroSlide(slide));
  const configuredOfferSlides = configuredSlides.filter((slide) => isOfferHeroSlide(slide));

  const includeDiscoveryOffers = config.includeDiscoveryOffers !== false;
  const maxOfferSlides = Math.max(
    0,
    Math.min(config.maxOfferSlides ?? DEFAULT_MAX_OFFER_SLIDES, MAX_HERO_SLIDES),
  );

  const discoveryOfferSlides = includeDiscoveryOffers
    ? discoveryRestaurantsToHeroOfferSlides(discoveryOfferRestaurants, maxOfferSlides)
    : [];

  const configuredOfferKeys = new Set(configuredOfferSlides.map((slide) => slide.id));
  const dedupedDiscoveryOffers = discoveryOfferSlides.filter((slide) => !configuredOfferKeys.has(slide.id));

  const offerSlides = [...configuredOfferSlides, ...dedupedDiscoveryOffers].slice(0, maxOfferSlides);
  const foodSlides =
    configuredFoodSlides.length > 0
      ? configuredFoodSlides
      : configuredSlides.filter((slide) => !isOfferHeroSlide(slide));

  if (offerSlides.length === 0) {
    return foodSlides.slice(0, MAX_HERO_SLIDES);
  }

  return interleaveHeroSlides(foodSlides, offerSlides, MAX_HERO_SLIDES);
}
