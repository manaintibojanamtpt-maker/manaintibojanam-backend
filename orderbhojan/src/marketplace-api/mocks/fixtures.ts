import type { RestaurantPublic } from '@/types/marketplace';

export const MOCK_RESTAURANTS: RestaurantPublic[] = [
  {
    restaurantId: 'obr_demo_biryani_001',
    restaurantSlug: 'demo-biryani-house',
    displayName: 'Demo Biryani House',
    logoUrl: 'https://placehold.co/96x96/orange/white?text=B',
    coverUrl: 'https://placehold.co/800x400/orange/white?text=Biryani',
    rating: 4.6,
    ratingCount: 1280,
    cuisines: ['Hyderabadi', 'Biryani'],
    priceForTwo: 499,
    distanceKm: 2.4,
    etaMinutes: { min: 28, max: 38 },
    deliveryFee: 20,
    isOpen: true,
    badges: ['offer', 'veg'],
  },
  {
    restaurantId: 'obr_demo_dosa_002',
    restaurantSlug: 'demo-dosa-corner',
    displayName: 'Demo Dosa Corner',
    logoUrl: 'https://placehold.co/96x96/green/white?text=D',
    coverUrl: 'https://placehold.co/800x400/green/white?text=Dosa',
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
    logoUrl: 'https://placehold.co/96x96/gray/white?text=C',
    rating: 4.2,
    ratingCount: 456,
    cuisines: ['North Indian', 'Chinese'],
    priceForTwo: 399,
    distanceKm: 4.5,
    etaMinutes: { min: 35, max: 45 },
    deliveryFee: 25,
    isOpen: false,
    badges: ['cloud_kitchen'],
  },
];

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
