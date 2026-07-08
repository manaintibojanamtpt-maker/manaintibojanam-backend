import type { RestaurantPublic } from '@/types/marketplace';
import {
  restaurantCoverBaseUrl,
  restaurantLogoBaseUrl,
} from '@/features/restaurant/data/restaurant-photo-manifest';
import { withKitchenFormat } from './restaurantMockHelpers';

const RAW_MOCK_RESTAURANTS: Array<Omit<RestaurantPublic, 'kitchenFormat'>> = [
  {
    restaurantId: 'obr_mana_inti_001',
    restaurantSlug: 'mana-inti-kitchen',
    displayName: 'Mana Inti Kitchen',
    logoUrl: restaurantLogoBaseUrl('mana-inti-kitchen'),
    coverUrl: restaurantCoverBaseUrl('mana-inti-kitchen'),
    rating: 4.8,
    ratingCount: 2140,
    cuisines: ['Andhra', 'Biryani', 'Meals'],
    priceForTwo: 449,
    distanceKm: 2.1,
    etaMinutes: { min: 25, max: 35 },
    deliveryFee: 20,
    isOpen: true,
    badges: ['offer', 'new'],
  },
  {
    restaurantId: 'obr_demo_biryani_001',
    restaurantSlug: 'demo-biryani-house',
    displayName: 'Demo Biryani House',
    logoUrl: restaurantLogoBaseUrl('demo-biryani-house'),
    coverUrl: restaurantCoverBaseUrl('demo-biryani-house'),
    rating: 4.6,
    ratingCount: 1280,
    cuisines: ['Hyderabadi', 'Biryani'],
    priceForTwo: 499,
    distanceKm: 2.4,
    etaMinutes: { min: 28, max: 38 },
    deliveryFee: 20,
    isOpen: true,
    badges: ['offer', 'veg', 'new'],
  },
  {
    restaurantId: 'obr_demo_dosa_002',
    restaurantSlug: 'demo-dosa-corner',
    displayName: 'Demo Dosa Corner',
    logoUrl: restaurantLogoBaseUrl('demo-dosa-corner'),
    coverUrl: restaurantCoverBaseUrl('demo-dosa-corner'),
    rating: 4.4,
    ratingCount: 890,
    cuisines: ['South Indian', 'Pure Veg'],
    priceForTwo: 299,
    distanceKm: 3.1,
    etaMinutes: { min: 22, max: 32 },
    deliveryFee: 15,
    isOpen: true,
    badges: ['pure_veg', 'new'],
  },
  {
    restaurantId: 'obr_demo_cloud_003',
    restaurantSlug: 'demo-cloud-kitchen',
    displayName: 'Demo Cloud Kitchen',
    logoUrl: restaurantLogoBaseUrl('demo-cloud-kitchen'),
    coverUrl: restaurantCoverBaseUrl('demo-cloud-kitchen'),
    rating: 4.2,
    ratingCount: 456,
    cuisines: ['North Indian', 'Chinese'],
    priceForTwo: 399,
    distanceKm: 4.5,
    etaMinutes: { min: 35, max: 45 },
    deliveryFee: 25,
    isOpen: false,
    badges: ['cloud_kitchen', 'new'],
  },
];

export const MOCK_RESTAURANTS: RestaurantPublic[] = RAW_MOCK_RESTAURANTS.map((restaurant) =>
  withKitchenFormat(restaurant),
);

export const MOCK_CONTEXT_TOKEN = 'mock-ctx-token-m0-demo';

export const MOCK_MENU = {
  categories: [
    {
      id: 'cat-main',
      name: 'Main Course',
      items: [
        {
          itemId: 'item-biryani-001',
          name: 'Hyderabadi Chicken Biryani',
          description: 'Served with raita and salan',
          price: 249,
          isVeg: false,
          available: true,
        },
        {
          itemId: 'item-biryani-002',
          name: 'Paneer Biryani',
          description: 'Fragrant basmati with paneer',
          price: 199,
          isVeg: true,
          available: true,
        },
      ],
    },
  ],
};

export const MOCK_QUOTE = {
  subtotal: 249,
  gstAmount: 0,
  gstPercent: 0,
  packagingFee: 0,
  deliveryFee: 20,
  deliveryPending: false,
  discountAmount: 0,
  grandTotal: 269,
  taxLabel: 'Taxes and Charges',
  lineItems: [
    { label: 'Item Total', amount: 249 },
    { label: 'Delivery', amount: 20 },
  ],
};
