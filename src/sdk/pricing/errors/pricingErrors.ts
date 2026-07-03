/**
 * PricingSDK — error messages (M8 PR-1).
 */

export const PRICING_ERROR_MESSAGES = {
  NOT_CONFIGURED: 'PricingSDK adapter is not configured',
  VALIDATION: 'Pricing query validation failed',
  INVALID_MONEY: 'Invalid money amount or currency',
  INVALID_COUPON: 'Invalid coupon code',
} as const;
