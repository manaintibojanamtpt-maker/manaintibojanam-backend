import { MOCK_CONTEXT_TOKEN, MOCK_RESTAURANTS } from './fixtures';
import type { RestaurantPublic } from '@/types/marketplace';
import type {
  RestaurantExperienceApiPayload,
  RestaurantExperiencePublic,
  RestaurantGalleryImage,
  RestaurantGalleryResponse,
  RestaurantHighlightsResponse,
  RestaurantOffer,
  RestaurantOffersResponse,
} from '@/types/marketplace-restaurant';
import { formatPriceRange, mapRestaurantPublicToExperience } from '@/types/marketplace-restaurant';

const GALLERY_BY_SLUG: Record<string, RestaurantGalleryImage[]> = {
  'demo-biryani-house': [
    {
      id: 'g1',
      url: 'https://placehold.co/800x500/orange/white?text=Kitchen',
      caption: 'Live kitchen',
    },
    {
      id: 'g2',
      url: 'https://placehold.co/800x500/orange/white?text=Biryani+Pot',
      caption: 'Dum biryani',
    },
    {
      id: 'g3',
      url: 'https://placehold.co/800x500/orange/white?text=Dining',
      caption: 'Packaging area',
    },
  ],
  'demo-dosa-corner': [
    {
      id: 'g1',
      url: 'https://placehold.co/800x500/green/white?text=Tawa',
      caption: 'Crisp dosas',
    },
    {
      id: 'g2',
      url: 'https://placehold.co/800x500/green/white?text=Filter+Coffee',
      caption: 'Filter coffee',
    },
  ],
  'demo-cloud-kitchen': [
    {
      id: 'g1',
      url: 'https://placehold.co/800x500/gray/white?text=Cloud+Kitchen',
      caption: 'Delivery-only kitchen',
    },
  ],
};

const OFFERS_BY_SLUG: Record<string, RestaurantOffer[]> = {
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

function defaultGallery(restaurant: RestaurantPublic): RestaurantGalleryImage[] {
  return GALLERY_BY_SLUG[restaurant.restaurantSlug] ?? [
    {
      id: 'g-default',
      url: restaurant.coverUrl ?? 'https://placehold.co/800x400/orange/white?text=Restaurant',
      caption: restaurant.displayName,
    },
  ];
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
  const gallery = defaultGallery(restaurant);
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
      { id: 'h1', title: 'Hygiene rated kitchen', subtitle: 'FSSAI compliant' },
      { id: 'h2', title: 'Popular for biryani', subtitle: `${restaurant.ratingCount ?? 0}+ ratings` },
      { id: 'h3', title: 'Fast prep', subtitle: `${restaurant.etaMinutes?.min ?? 25} min avg` },
    ],
  };
}

export function buildRestaurantGallery(slug: string): RestaurantGalleryResponse {
  const restaurant = findRestaurant(slug);
  return { slug, images: defaultGallery(restaurant) };
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
