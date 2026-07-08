import { MOCK_CONTEXT_TOKEN, MOCK_RESTAURANTS } from './fixtures';
import type { RestaurantPublic } from '@/types/marketplace';
import type {
  RestaurantExperienceApiPayload,
  RestaurantExperiencePublic,
  RestaurantGalleryResponse,
  RestaurantHighlightsResponse,
  RestaurantOffer,
  RestaurantOffersResponse,
} from '@/types/marketplace-restaurant';
import { formatPriceRange, mapRestaurantPublicToExperience } from '@/types/marketplace-restaurant';
import { buildRestaurantGalleryFromManifest } from '@/features/restaurant/data/restaurant-photo-manifest';

const OFFERS_BY_SLUG: Record<string, RestaurantOffer[]> = {
  'mana-inti-kitchen': [
    { id: 'o1', title: '50% OFF up to ₹100', description: 'On orders above ₹299', badge: 'Best deal' },
  ],
  'demo-biryani-house': [
    { id: 'o1', title: '50% OFF up to ₹100', description: 'On orders above ₹299', badge: 'Best deal' },
    { id: 'o2', title: 'Free delivery', description: 'Weekend special', badge: 'Free delivery' },
  ],
  'demo-dosa-corner': [
    { id: 'o1', title: 'Flat ₹40 OFF', description: 'On breakfast combos' },
  ],
  'demo-cloud-kitchen': [
    { id: 'o1', title: 'Buy 1 Get 1', description: 'Selected bowls', badge: 'BOGO' },
  ],
};

function findRestaurant(slug: string): RestaurantPublic {
  return MOCK_RESTAURANTS.find((r) => r.restaurantSlug === slug) ?? MOCK_RESTAURANTS[0];
}

function defaultGallery(slug: string) {
  return buildRestaurantGalleryFromManifest(slug).map(({ id, url, caption }) => ({
    id,
    url,
    caption,
  }));
}

function defaultOffers(restaurant: RestaurantPublic): RestaurantOffer[] {
  return (
    OFFERS_BY_SLUG[restaurant.restaurantSlug] ??
    (restaurant.badges.includes('offer')
      ? [{ id: 'o-default', title: 'Special offer available', description: 'Limited time' }]
      : [])
  );
}

export function buildRestaurantExperiencePayload(slug: string): RestaurantExperienceApiPayload {
  const restaurant = findRestaurant(slug);
  const base = mapRestaurantPublicToExperience(restaurant);
  const gallery = defaultGallery(slug);
  const offers = defaultOffers(restaurant);

  const experience: RestaurantExperiencePublic = {
    ...base,
    priceRange: formatPriceRange(restaurant.priceForTwo),
    todayHours: restaurant.isOpen ? '11:00 AM – 11:00 PM' : 'Closed today',
    gallery,
    description:
      `${restaurant.displayName} serves authentic ${restaurant.cuisines.join(' & ')} flavours with care-packed delivery. A Mana Inti Bojanam partner kitchen focused on consistency, hygiene, and homestyle taste.`,
    offers,
  };

  return {
    experience,
    contextToken: MOCK_CONTEXT_TOKEN,
    hours: [
      { day: 'Mon–Sun', open: '11:00 AM', close: '11:00 PM', isToday: true },
    ],
    serviceability: {
      delivery: restaurant.isOpen,
      pickup: true,
      message: restaurant.isOpen ? 'Delivery available to your location' : 'Currently closed for delivery',
    },
    policies: [
      {
        id: 'p1',
        title: 'Packaging',
        body: 'Eco-friendly containers with sealed delivery bags.',
      },
      {
        id: 'p2',
        title: 'Allergen info',
        body: 'Please mention allergies in order notes when ordering.',
      },
    ],
    highlights: [
      { id: 'h1', title: 'Verified kitchen', subtitle: 'FSSAI compliant' },
      { id: 'h2', title: 'Popular for biryani', subtitle: `${restaurant.ratingCount ?? 0}+ ratings` },
      { id: 'h3', title: 'Fast prep', subtitle: `${restaurant.etaMinutes?.min ?? 25} min avg` },
    ],
  };
}

export function buildRestaurantGallery(slug: string): RestaurantGalleryResponse {
  return { slug, images: defaultGallery(slug) };
}

export function buildRestaurantOffers(slug: string): RestaurantOffersResponse {
  const restaurant = findRestaurant(slug);
  return { slug, offers: defaultOffers(restaurant) };
}

export function buildRestaurantHighlights(slug: string): RestaurantHighlightsResponse {
  const payload = buildRestaurantExperiencePayload(slug);
  return { slug, highlights: payload.highlights };
}

/** Legacy M0 detail envelope for backward compatibility. */
export function buildLegacyRestaurantDetail(slug: string) {
  const restaurant = findRestaurant(slug);
  const payload = buildRestaurantExperiencePayload(slug);
  return {
    restaurant,
    contextToken: MOCK_CONTEXT_TOKEN,
    description: payload.experience.description,
    hours: payload.hours.map((h) => ({ day: h.day, open: h.open, close: h.close })),
    offers: payload.experience.offers,
    serviceability: payload.serviceability,
  };
}
