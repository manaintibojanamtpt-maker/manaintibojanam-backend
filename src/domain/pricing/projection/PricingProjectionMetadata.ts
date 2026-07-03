/**
 * Pricing projection — metadata constants (M8 PR-6).
 * Pure domain — no infrastructure imports.
 */

export const PRICING_PROJECTION_DOMAIN_VERSION = '0.1.0-foundation' as const;
export const PRICING_PROJECTION_SCHEMA_VERSION = '0.1.0' as const;
export const PRICING_PROJECTION_MODULE = 'pricing-projection' as const;

export const PRICING_PROJECTION_FOUNDATION_NAME = 'pricing-projection-foundation' as const;
export const PRICING_PROJECTION_FOUNDATION_VERSION = '0.1.0-foundation' as const;
export const PRICING_PROJECTION_FOUNDATION_CONSUMER_GROUP = 'pricing-projection-foundation' as const;

export interface PricingProjectionIdentity {
  readonly projectionName: string;
  readonly projectionVersion: string;
  readonly consumerGroup: string;
  readonly schemaVersion: string;
}

export const PRICING_PROJECTION_FOUNDATION_IDENTITY: PricingProjectionIdentity = {
  projectionName: PRICING_PROJECTION_FOUNDATION_NAME,
  projectionVersion: PRICING_PROJECTION_FOUNDATION_VERSION,
  consumerGroup: PRICING_PROJECTION_FOUNDATION_CONSUMER_GROUP,
  schemaVersion: PRICING_PROJECTION_SCHEMA_VERSION,
};
