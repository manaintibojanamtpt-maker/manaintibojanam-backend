/**
 * Single source of truth for marketing demo / preview figures.
 * Hero dashboard, owner preview, and AI copy should reference this only.
 */
export const marketingDemoData = {
  storefrontUrl: 'bhojanos.com/your-kitchen',
  storefrontPath: '/k/your-kitchen',

  dashboard: {
    todaysRevenue: 18_420,
    ordersToday: 67,
    preparing: 8,
    inventoryAlerts: 2,
    activeDeliveries: 12,
    aiSuggestions: 8,
    revenueChangePercent: 18,
    inventoryAlertMessage: 'Paneer below threshold. Reorder before Friday lunch.',
  },

  demandForecast: {
    predictedOrdersMin: 450,
    predictedOrdersMax: 480,
    peakHour: '7:30 PM',
    recommendation: 'Increase Biryani prep by 20%.',
  },

  weeklyProfit: {
    netAmount: 124_800,
    changePercent: 12,
  },

  /** Revenue bar chart heights (0–100) — shared across dashboard previews */
  revenueBarHeights: [32, 45, 38, 52, 48, 68, 72, 65, 78, 84, 76, 92] as const,
} as const;

export const socialProofStrip = {
  restaurantCount: '50+',
  restaurantCountLabel: 'restaurants onboarding',
  cities: ['Hyderabad', 'Bengaluru', 'Tirupati', 'Chennai'] as const,
  testimonial: {
    quote:
      'We moved repeat customers to our own storefront in two weeks — zero commission on every direct order.',
    name: 'Rajesh K.',
    role: 'Cloud Kitchen Owner, Hyderabad',
  },
} as const;
