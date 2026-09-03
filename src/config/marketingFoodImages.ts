/**
 * Marketing-specific food image configuration.
 * These are verified working Unsplash photo URLs in WebP format.
 * Only used for illustrative marketing previews — never implies a real
 * restaurant's photography. Each image has graceful loading/fallback handling
 * at the component level.
 */
export interface MarketingFoodImage {
  url: string;
  alt: string;
}

export const MARKETING_FOOD_IMAGES: Record<string, MarketingFoodImage> = {
  'Chicken Biryani': {
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=400&fm=webp',
    alt: 'Steaming chicken biryani with saffron rice',
  },
  'Paneer Butter Masala': {
    url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&q=80&w=400&fm=webp',
    alt: 'Creamy paneer butter masala curry',
  },
  'Masala Dosa': {
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=400&fm=webp',
    alt: 'Crispy masala dosa with potato filling',
  },
  'Idli': {
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=400&fm=webp',
    alt: 'Steamed idli with chutney',
  },
  'Veg Thali': {
    url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400&fm=webp',
    alt: 'Traditional Indian thali meal',
  },
  'Gulab Jamun': {
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=400&fm=webp',
    alt: 'Gulab jamun dessert',
  },
};

export function getMarketingFoodImage(name: string): MarketingFoodImage | undefined {
  return MARKETING_FOOD_IMAGES[name];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Cinematic redesign assets — all IDs verified HTTP 200 (see _verify_images.ps1)
 * Portrait crops (3:4) via Unsplash resize params — edge-to-edge card fills.
 * Still illustrative marketing previews only.
 * ────────────────────────────────────────────────────────────────────────── */

/** Portrait food-discovery cards (w=600 h=800 → 3:4 crop, WebP via auto=format). */
export interface CinematicFoodCard {
  name: string;
  category: string;
  restaurant: string;
  rating: string;
  price: string;
  url: string;
  alt: string;
}

const P = (id: string) =>
  `https://images.unsplash.com/${id}?q=80&w=600&h=800&auto=format&fit=crop`;

export const CINEMATIC_FOOD_CARDS: CinematicFoodCard[] = [
  {
    name: 'Chicken Biryani',
    category: 'Biryani',
    restaurant: 'Biryani House',
    rating: '4.8',
    price: '₹249',
    url: P('photo-1589302168068-964664d93dc0'),
    alt: 'Steaming chicken biryani with saffron rice and herbs',
  },
  {
    name: 'Masala Dosa',
    category: 'South Indian',
    restaurant: 'Dosa Corner',
    rating: '4.7',
    price: '₹129',
    url: P('photo-1567337710282-00832b415979'),
    alt: 'Crispy golden masala dosa with chutney and sambar',
  },
  {
    name: 'Paneer Butter Masala',
    category: 'Curry',
    restaurant: 'Spice Route',
    rating: '4.9',
    price: '₹279',
    url: P('photo-1631452180519-c014fe946bc7'),
    alt: 'Creamy paneer butter masala garnished with cream',
  },
  {
    name: 'Butter Chicken',
    category: 'Curry',
    restaurant: 'Tandoori Flames',
    rating: '4.8',
    price: '₹329',
    url: P('photo-1585937421612-70a008356fbe'),
    alt: 'Rich butter chicken curry in a dark bowl',
  },
  {
    name: 'Veg Thali',
    category: 'Meals',
    restaurant: 'Annapurna Kitchen',
    rating: '4.6',
    price: '₹199',
    url: P('photo-1596560548464-f010549b84d7'),
    alt: 'Traditional Indian veg thali with multiple dishes',
  },
  {
    name: 'Hyderabadi Biryani',
    category: 'Biryani',
    restaurant: 'Nawabi Kitchen',
    rating: '4.9',
    price: '₹289',
    url: P('photo-1563379091339-03b21ab4a4f8'),
    alt: 'Fragrant Hyderabadi biryani served in a handi',
  },
  {
    name: 'Paneer Tikka Masala',
    category: 'Curry',
    restaurant: 'Spice Route',
    rating: '4.7',
    price: '₹269',
    url: P('photo-1546833999-b9f581a1996d'),
    alt: 'Paneer tikka masala curry served with naan',
  },
  {
    name: 'Samosa Chaat',
    category: 'Street Food',
    restaurant: 'Chaat Street',
    rating: '4.5',
    price: '₹99',
    url: P('photo-1601050690597-df0568f70950'),
    alt: 'Samosa chaat topped with chutneys and sev',
  },
  {
    name: 'Veg Pulav',
    category: 'Rice',
    restaurant: 'Annapurna Kitchen',
    rating: '4.6',
    price: '₹179',
    url: P('photo-1631515243349-e0cb75fb8d3a'),
    alt: 'Aromatic vegetable pulav with garnish',
  },
  {
    name: 'South Indian Combo',
    category: 'South Indian',
    restaurant: 'Dosa Corner',
    rating: '4.7',
    price: '₹149',
    url: P('photo-1589301760014-d929f3979dbc'),
    alt: 'South Indian combo of dosa, idli and chutney',
  },
  {
    name: 'Idli & Vada',
    category: 'South Indian',
    restaurant: 'Madras Cafe',
    rating: '4.6',
    price: '₹119',
    url: P('photo-1631515243349-e0cb75fb8d3a'),
    alt: 'Steamed idli and crispy vada with chutney',
  },
  {
    name: 'Gulab Jamun',
    category: 'Dessert',
    restaurant: 'Sweet House',
    rating: '4.8',
    price: '₹89',
    url: P('photo-1577219491135-ce391730fb2c'),
    alt: 'Warm gulab jamun in sugar syrup',
  },
  {
    name: 'Premium Thali',
    category: 'Meals',
    restaurant: 'Royal Kitchen',
    rating: '4.9',
    price: '₹349',
    url: P('photo-1504674900247-0877df9cc836'),
    alt: 'Premium restaurant thali with multiple dishes',
  },
] as const;

/** Cinematic environment photography (kitchen / interior / dining). */
export const CINEMATIC_ENV_IMAGES = {
  kitchen: {
    url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1200&auto=format&fit=crop',
    alt: 'Professional restaurant kitchen with chefs cooking over flame',
  },
  kitchenWide: {
    url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2000&auto=format&fit=crop',
    alt: 'Professional restaurant kitchen with chefs cooking over flame',
  },
  chef: {
    url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=1000&auto=format&fit=crop',
    alt: 'Professional chef plating a dish in a warm restaurant kitchen',
  },
  restaurantInterior: {
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop',
    alt: 'Warm premium restaurant interior with ambient lighting',
  },
  dining: {
    url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1200&auto=format&fit=crop',
    alt: 'Guests enjoying a premium dining experience',
  },
  foodTable: {
    url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop',
    alt: 'Table full of freshly prepared dishes',
  },
} as const;
