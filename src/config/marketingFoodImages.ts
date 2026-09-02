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