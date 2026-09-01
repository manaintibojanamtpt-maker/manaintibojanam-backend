/**
 * Single source of truth for marketing demo / preview figures.
 * Hero dashboard, owner preview, and AI copy should reference this only.
 *
 * NOTE: All demo figures are illustrative placeholders for UI previews only.
 * They do not represent real business metrics or customer data.
 */
export const marketingDemoData = {
  storefrontUrl: 'bhojanos.com/your-kitchen',
  storefrontPath: '/k/your-kitchen',

  dashboard: {
    todaysRevenue: 0,
    ordersToday: 0,
    preparing: 0,
    inventoryAlerts: 0,
    activeDeliveries: 0,
    aiSuggestions: 0,
    revenueChangePercent: 0,
    inventoryAlertMessage: 'Inventory alerts appear here when stock runs low.',
  },

  demandForecast: {
    predictedOrdersMin: 0,
    predictedOrdersMax: 0,
    peakHour: '7:30 PM',
    recommendation: 'AI recommendations appear here based on your data.',
  },

  weeklyProfit: {
    netAmount: 0,
    changePercent: 0,
  },

  /** Revenue bar chart heights (0–100) — shared across dashboard previews */
  revenueBarHeights: [32, 45, 38, 52, 48, 68, 72, 65, 78, 84, 76, 92] as const,
} as const;

/**
 * OrderBhojan public URLs — used for CTAs linking to the customer experience.
 */
export const orderBhojanPublic = {
  baseUrl: 'https://orderbhojan.web.app',
  homeUrl: 'https://orderbhojan.web.app',
} as const;
