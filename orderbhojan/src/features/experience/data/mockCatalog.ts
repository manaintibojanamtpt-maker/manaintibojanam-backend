import type {
  FoodCategory,
  HeroBannerSlide,
  MockFoodItem,
  MockRestaurant,
  MockSearchTerm,
} from '../domain/experience.types';

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

export const HERO_BANNERS: readonly HeroBannerSlide[] = [
  {
    id: 'banner-1',
    title: '50% OFF First Order',
    subtitle: 'Hyderabadi biryani from top kitchens near you',
    cta: 'Order now',
    gradient: 'linear-gradient(135deg, #ff6b35 0%, #ff7a00 45%, #ffb347 100%)',
    imageUrl: 'https://placehold.co/640x320/orange/white?text=Biryani',
  },
  {
    id: 'banner-2',
    title: 'Free Delivery Weekend',
    subtitle: 'On orders above ₹299 from cloud kitchens',
    cta: 'Explore',
    gradient: 'linear-gradient(135deg, #2d5016 0%, #4caf50 50%, #81c784 100%)',
    imageUrl: 'https://placehold.co/640x320/green/white?text=Meals',
  },
  {
    id: 'banner-3',
    title: 'South Indian Specials',
    subtitle: 'Crisp dosas & filter coffee until midnight',
    cta: 'Browse',
    gradient: 'linear-gradient(135deg, #5d4037 0%, #8d6e63 50%, #ffab91 100%)',
    imageUrl: 'https://placehold.co/640x320/brown/white?text=Dosa',
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
    imageUrl: 'https://placehold.co/480x300/orange/white?text=Mana+Inti',
    logoUrl: 'https://placehold.co/64x64/orange/white?text=MI',
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
    imageUrl: 'https://placehold.co/480x300/orange/white?text=Biryani',
    logoUrl: 'https://placehold.co/64x64/orange/white?text=BH',
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
    imageUrl: 'https://placehold.co/480x300/green/white?text=Dosa',
    logoUrl: 'https://placehold.co/64x64/green/white?text=DC',
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
    imageUrl: 'https://placehold.co/480x300/gray/white?text=Cloud',
    logoUrl: 'https://placehold.co/64x64/gray/white?text=CK',
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
    imageUrl: 'https://placehold.co/120x120/orange/white?text=Biryani',
  },
  {
    id: 'f2',
    name: 'Paneer Butter Masala',
    description: 'Rich creamy gravy with soft paneer',
    price: 199,
    oldPrice: 249,
    isVeg: true,
    imageUrl: 'https://placehold.co/120x120/green/white?text=Paneer',
  },
  {
    id: 'f3',
    name: 'Masala Dosa',
    description: 'Crisp dosa with potato masala',
    price: 89,
    isVeg: true,
    imageUrl: 'https://placehold.co/120x120/green/white?text=Dosa',
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
