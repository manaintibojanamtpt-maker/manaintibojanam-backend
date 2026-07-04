import { MOCK_CONTEXT_TOKEN } from './fixtures';
import { MOCK_RESTAURANTS } from './fixtures';
import type {
  FoodCategoriesResponse,
  FoodCollectionResponse,
  FoodMenuResponse,
  FoodPublic,
} from '@/types/marketplace-food';

const COMMON_ADDONS = [
  { id: 'addon-cheese', kind: 'extra_cheese', label: 'Extra cheese', price: 30 },
  { id: 'addon-spice', kind: 'extra_spice', label: 'Extra spice', price: 0 },
  { id: 'addon-butter', kind: 'butter', label: 'Butter', price: 20 },
  { id: 'addon-drink', kind: 'soft_drink', label: 'Soft drink', price: 49 },
  { id: 'addon-dessert', kind: 'dessert', label: 'Dessert add-on', price: 79 },
  { id: 'addon-pack', kind: 'packaging', label: 'Premium packaging', price: 15 },
] as const;

function item(
  partial: Omit<FoodPublic, 'currency' | 'variants' | 'addons'> & {
    variants?: FoodPublic['variants'];
    addons?: FoodPublic['addons'];
  },
): FoodPublic {
  return {
    currency: 'INR',
    variants: [],
    addons: [...COMMON_ADDONS],
    ...partial,
  };
}

const MENU_BY_SLUG: Record<string, FoodPublic[]> = {
  'demo-biryani-house': [
    item({
      foodId: 'food_biryani_chicken',
      slug: 'hyderabadi-chicken-biryani',
      name: 'Hyderabadi Chicken Biryani',
      description: 'Slow-cooked dum biryani with raita and salan',
      image: 'https://placehold.co/320x240/orange/white?text=Biryani',
      price: 299,
      offerPrice: 249,
      category: 'Biryani',
      categoryId: 'cat-biryani',
      rating: 4.8,
      dietary: 'nonVeg',
      preparationTime: 25,
      availability: true,
      bestSeller: true,
      chefSpecial: true,
      variants: [
        { id: 'v-half', kind: 'half', label: 'Half', price: 199, offerPrice: 169 },
        { id: 'v-full', kind: 'full', label: 'Full', price: 299, offerPrice: 249 },
        { id: 'v-500', kind: '500gm', label: '500 gm', price: 349 },
        { id: 'v-1kg', kind: '1kg', label: '1 Kg', price: 599 },
      ],
      nutritionSummary: 'Approx. 680 kcal per serving',
      allergenSummary: 'Contains dairy, nuts',
    }),
    item({
      foodId: 'food_biryani_paneer',
      slug: 'paneer-biryani',
      name: 'Paneer Biryani',
      description: 'Fragrant basmati with soft paneer cubes',
      image: 'https://placehold.co/320x240/green/white?text=Paneer',
      price: 219,
      offerPrice: 199,
      category: 'Biryani',
      categoryId: 'cat-biryani',
      rating: 4.6,
      dietary: 'veg',
      preparationTime: 22,
      availability: true,
      recommended: true,
      variants: [
        { id: 'v-sm', kind: 'small', label: 'Small', price: 169 },
        { id: 'v-md', kind: 'medium', label: 'Medium', price: 219, offerPrice: 199 },
        { id: 'v-lg', kind: 'large', label: 'Large', price: 279 },
      ],
    }),
    item({
      foodId: 'food_kebab',
      slug: 'chicken-kebab-platter',
      name: 'Chicken Kebab Platter',
      description: 'Chargrilled kebabs with mint chutney',
      image: 'https://placehold.co/320x240/red/white?text=Kebab',
      price: 279,
      category: 'Starters',
      categoryId: 'cat-starters',
      rating: 4.5,
      dietary: 'nonVeg',
      preparationTime: 18,
      availability: true,
      newItem: true,
    }),
    item({
      foodId: 'food_raita',
      slug: 'special-raita',
      name: 'Special Raita',
      description: 'Cooling onion-tomato raita',
      image: 'https://placehold.co/320x240/blue/white?text=Raita',
      price: 49,
      category: 'Sides',
      categoryId: 'cat-sides',
      dietary: 'veg',
      preparationTime: 5,
      availability: true,
    }),
    item({
      foodId: 'food_salan',
      slug: 'mirchi-ka-salan',
      name: 'Mirchi ka Salan',
      description: 'Hyderabadi classic salan',
      image: 'https://placehold.co/320x240/brown/white?text=Salan',
      price: 69,
      category: 'Sides',
      categoryId: 'cat-sides',
      dietary: 'veg',
      preparationTime: 5,
      availability: true,
      bestSeller: true,
    }),
    item({
      foodId: 'food_dessert',
      slug: 'double-ka-meetha',
      name: 'Double ka Meetha',
      description: 'Hyderabadi bread pudding dessert',
      image: 'https://placehold.co/320x240/pink/white?text=Dessert',
      price: 99,
      offerPrice: 79,
      category: 'Desserts',
      categoryId: 'cat-desserts',
      dietary: 'veg',
      preparationTime: 10,
      availability: true,
      chefSpecial: true,
    }),
  ],
  'demo-dosa-corner': [
    item({
      foodId: 'food_masala_dosa',
      slug: 'masala-dosa',
      name: 'Masala Dosa',
      description: 'Crisp dosa with potato masala',
      image: 'https://placehold.co/320x240/green/white?text=Dosa',
      price: 89,
      category: 'Dosas',
      categoryId: 'cat-dosas',
      rating: 4.7,
      dietary: 'veg',
      preparationTime: 12,
      availability: true,
      bestSeller: true,
      variants: [
        { id: 'v-sm', kind: 'small', label: 'Small', price: 69 },
        { id: 'v-md', kind: 'medium', label: 'Regular', price: 89 },
        { id: 'v-lg', kind: 'large', label: 'Family', price: 129 },
      ],
    }),
    item({
      foodId: 'food_idli',
      slug: 'idli-sambar',
      name: 'Idli Sambar (2 pcs)',
      description: 'Steamed idlis with sambar and chutney',
      price: 59,
      category: 'Breakfast',
      categoryId: 'cat-breakfast',
      dietary: 'veg',
      preparationTime: 8,
      availability: true,
      recommended: true,
    }),
    item({
      foodId: 'food_filter_coffee',
      slug: 'filter-coffee',
      name: 'Filter Coffee',
      description: 'South Indian filter kaapi',
      price: 45,
      category: 'Beverages',
      categoryId: 'cat-beverages',
      dietary: 'veg',
      preparationTime: 5,
      availability: true,
    }),
  ],
};

function getItems(slug: string): FoodPublic[] {
  return MENU_BY_SLUG[slug] ?? MENU_BY_SLUG['demo-biryani-house'];
}

function buildCategories(items: readonly FoodPublic[]) {
  const map = new Map<string, { id: string; name: string; count: number }>();
  for (const food of items) {
    const existing = map.get(food.categoryId);
    if (existing) existing.count += 1;
    else map.set(food.categoryId, { id: food.categoryId, name: food.category, count: 1 });
  }
  return [...map.values()].map((c) => ({
    id: c.id,
    slug: c.id.replace('cat-', ''),
    name: c.name,
    itemCount: c.count,
  }));
}

export function buildFoodMenu(slug: string): FoodMenuResponse {
  const items = getItems(slug);
  const restaurant = MOCK_RESTAURANTS.find((r) => r.restaurantSlug === slug);
  const featuredIds = items.filter((i) => i.chefSpecial || i.bestSeller).map((i) => i.foodId);
  const todaysSpecialIds = items.filter((i) => i.offerPrice).map((i) => i.foodId).slice(0, 3);

  return {
    slug,
    restaurantName: restaurant?.displayName,
    categories: buildCategories(items),
    items,
    featuredIds,
    todaysSpecialIds,
  };
}

export function buildFoodMenuPayload(slug: string) {
  return {
    ...buildFoodMenu(slug),
    contextToken: MOCK_CONTEXT_TOKEN,
  };
}

export function buildFoodCategories(slug: string): FoodCategoriesResponse {
  const menu = buildFoodMenu(slug);
  return { slug, categories: menu.categories };
}

export function buildFoodRecommended(slug: string): FoodCollectionResponse {
  const items = getItems(slug).filter((i) => i.recommended);
  return { slug, items };
}

export function buildFoodBestsellers(slug: string): FoodCollectionResponse {
  const items = getItems(slug).filter((i) => i.bestSeller);
  return { slug, items };
}

export function buildLegacyMenuResponse() {
  const menu = buildFoodMenu('demo-biryani-house');
  return {
    categories: menu.categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      items: menu.items
        .filter((i) => i.categoryId === cat.id)
        .map((i) => ({
          itemId: i.foodId,
          name: i.name,
          description: i.description,
          price: i.offerPrice ?? i.price,
          isVeg: i.dietary === 'veg',
          imageUrl: i.image,
          available: i.availability,
        })),
    })),
  };
}
