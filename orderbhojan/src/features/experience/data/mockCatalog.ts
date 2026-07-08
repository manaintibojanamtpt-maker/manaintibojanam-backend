import type {
  FoodCategory,
  HeroBannerSlide,
  MockFoodItem,
  MockRestaurant,
  MockSearchTerm,
} from '../domain/experience.types';

/** Licensed food photography — Unsplash (see docs/photography/ATTRIBUTION.md) */
const FOOD = {
  heroBiryani:
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8',
  kitchenWarm:
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe',
  biryaniSpread:
    'https://images.unsplash.com/photo-1596797038530-2c107229654b',
  dosaTawa:
    'https://images.unsplash.com/photo-1601050690597-df0568f70950',
  thaliMeals:
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d',
  paneer:
    'https://images.unsplash.com/photo-1574484284002-952d92456975',
  pizza:
    'https://images.unsplash.com/photo-1513104890138-7c749659a591',
  northIndian:
    'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398',
  chinese:
    'https://images.unsplash.com/photo-1585034275571-047884d08626',
  logoBiryani:
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8',
  logoDosa:
    'https://images.unsplash.com/photo-1601050690597-df0568f70950',
  logoThali:
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d',
  logoKitchen:
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe',
} as const;

export const FOOD_CATEGORIES: readonly FoodCategory[] = [
  { id: 'pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'biryani', label: 'Biryani', emoji: '🍛' },
  { id: 'meals', label: 'Meals', emoji: '🍱' },
  { id: 'south-indian', label: 'South Indian', emoji: '🥘' },
  { id: 'north-indian', label: 'North Indian', emoji: '🫓' },
  { id: 'chinese', label: 'Chinese', emoji: '🥡' },
  { id: 'fast-food', label: 'Fast Food', emoji: '🍔' },
  { id: 'desserts', label: 'Desserts', emoji: '🍰' },
  { id: 'juices', label: 'Juices', emoji: '🥤' },
];

/** Home hero — first banner only in v1 */
export const HERO_BANNERS: readonly HeroBannerSlide[] = [
  {
    id: 'banner-1',
    title: 'Hyderabadi Dum Biryani',
    subtitle: 'Slow-cooked comfort, Andhra spice',
    cta: 'Order now',
    gradient: 'linear-gradient(135deg, #ff6b35 0%, #ff7a00 45%, #ffb347 100%)',
    imageUrl: FOOD.heroBiryani,
  },
  {
    id: 'banner-2',
    title: 'Free Delivery Weekend',
    subtitle: 'On orders above ₹299 from cloud kitchens',
    cta: 'Explore',
    gradient: 'linear-gradient(135deg, #2d5016 0%, #4caf50 50%, #81c784 100%)',
    imageUrl: FOOD.thaliMeals,
  },
  {
    id: 'banner-3',
    title: 'South Indian Specials',
    subtitle: 'Crisp dosas & filter coffee until midnight',
    cta: 'Browse',
    gradient: 'linear-gradient(135deg, #5d4037 0%, #8d6e63 50%, #ffab91 100%)',
    imageUrl: FOOD.dosaTawa,
  },
];

export const FEATURED_RESTAURANTS: readonly MockRestaurant[] = [
  {
    id: 'r1',
    slug: 'mana-inti-kitchen',
    name: 'Mana Inti Kitchen',
    cuisine: 'Andhra · Biryani · Meals',
    rating: 4.8,
    eta: '25–35 min',
    deliveryFee: '₹20',
    distance: '2.1 km',
    imageUrl: FOOD.kitchenWarm,
    logoUrl: FOOD.logoKitchen,
    categoryIds: ['biryani', 'meals', 'north-indian'],
    offer: '50% OFF',
    isVeg: false,
    isCloudKitchen: false,
    isOpen: true,
    isFavorite: true,
  },
  {
    id: 'r2',
    slug: 'demo-biryani-house',
    name: 'Demo Biryani House',
    cuisine: 'Hyderabadi · Biryani',
    rating: 4.6,
    eta: '28–38 min',
    deliveryFee: '₹20',
    distance: '2.4 km',
    imageUrl: FOOD.biryaniSpread,
    logoUrl: FOOD.logoBiryani,
    categoryIds: ['biryani'],
    offer: 'Flat ₹75 OFF',
    isVeg: false,
    isCloudKitchen: false,
    isOpen: true,
    isFavorite: false,
  },
  {
    id: 'r3',
    slug: 'demo-dosa-corner',
    name: 'Demo Dosa Corner',
    cuisine: 'South Indian · Pure Veg',
    rating: 4.4,
    eta: '22–32 min',
    deliveryFee: '₹15',
    distance: '3.1 km',
    imageUrl: FOOD.dosaTawa,
    logoUrl: FOOD.logoDosa,
    categoryIds: ['south-indian', 'meals'],
    isVeg: true,
    isCloudKitchen: false,
    isOpen: true,
    isFavorite: false,
  },
  {
    id: 'r4',
    slug: 'demo-cloud-kitchen',
    name: 'Demo Cloud Kitchen',
    cuisine: 'North Indian · Chinese',
    rating: 4.2,
    eta: '35–45 min',
    deliveryFee: '₹25',
    distance: '4.5 km',
    imageUrl: FOOD.thaliMeals,
    logoUrl: FOOD.logoThali,
    categoryIds: ['north-indian', 'chinese', 'meals'],
    isVeg: false,
    isCloudKitchen: true,
    isOpen: false,
    isFavorite: false,
  },
];

export const TRENDING_FOODS: readonly MockFoodItem[] = [
  {
    id: 'f1',
    name: 'Hyderabadi Chicken Biryani',
    description: 'Served with raita and salan',
    price: 249,
    oldPrice: 349,
    isVeg: false,
    imageUrl: FOOD.heroBiryani,
    categoryIds: ['biryani'],
    restaurantSlug: 'demo-biryani-house',
    restaurantId: 'r2',
  },
  {
    id: 'f2',
    name: 'Paneer Butter Masala',
    description: 'Rich creamy gravy with soft paneer',
    price: 199,
    oldPrice: 249,
    isVeg: true,
    imageUrl: FOOD.paneer,
    categoryIds: ['north-indian', 'meals'],
    restaurantSlug: 'mana-inti-kitchen',
    restaurantId: 'r1',
  },
  {
    id: 'f3',
    name: 'Masala Dosa',
    description: 'Crisp dosa with potato masala',
    price: 89,
    isVeg: true,
    imageUrl: FOOD.dosaTawa,
    categoryIds: ['south-indian'],
    restaurantSlug: 'demo-dosa-corner',
    restaurantId: 'r3',
  },
  {
    id: 'f4',
    name: 'Margherita Pizza',
    description: 'Wood-fired crust with fresh mozzarella',
    price: 299,
    isVeg: true,
    imageUrl: FOOD.pizza,
    categoryIds: ['pizza', 'fast-food'],
    restaurantSlug: 'demo-cloud-kitchen',
    restaurantId: 'r4',
  },
];

export const RECENT_SEARCHES: readonly MockSearchTerm[] = [
  { id: 's1', label: 'Biryani' },
  { id: 's2', label: 'Dosa' },
  { id: 's3', label: 'Pizza' },
];

export const POPULAR_SEARCHES: readonly MockSearchTerm[] = [
  { id: 'p1', label: 'Chicken Biryani' },
  { id: 'p2', label: 'Veg Meals' },
  { id: 'p3', label: 'Ice Cream' },
  { id: 'p4', label: 'Chinese' },
];

export const DELIVERY_ADDRESS_PLACEHOLDER = 'Add delivery address — Hyderabad';

export const HOME_CRAVING_LINES = [
  'Slow-cooked comfort, Andhra spice',
  'Freshly prepared after your order',
  'Hyderabadi biryani near you',
] as const;

export interface HomeCategoryChip {
  readonly id: 'pizza' | 'biryani' | 'meals' | 'south-indian' | 'north-indian';
  readonly label: string;
}

export const HOME_CATEGORY_CHIPS: readonly HomeCategoryChip[] = [
  { id: 'pizza', label: 'Pizza' },
  { id: 'biryani', label: 'Biryani' },
  { id: 'meals', label: 'Meals' },
  { id: 'south-indian', label: 'South Indian' },
  { id: 'north-indian', label: 'North Indian' },
];
