/**
 * Pricing catalog shadow projection validation (M8 PR-7).
 * Pure domain — no infrastructure imports.
 */

import type { PricingCatalogProjectionReadModel } from './PricingProjectionState';
import { isSupportedPricingCatalogProjectionEvent } from './PricingProjectionMetadata';

const FORBIDDEN_READ_MODEL_FIELDS = [
  'price',
  'prices',
  'unitPrice',
  'totalPrice',
  'gst',
  'tax',
  'discount',
  'discounts',
  'couponPayload',
  'campaignPayload',
  'offerPayload',
  'billing',
  'dynamicPricing',
  'grandTotal',
  'amount',
] as const;

export function validatePricingCatalogProjectionReadModel(
  model: PricingCatalogProjectionReadModel
): readonly string[] {
  const errors: string[] = [];
  if (!model.priceListId) errors.push('priceListId is required');
  if (!model.tenantId) errors.push('tenantId is required');
  if (!model.pricingVersion) errors.push('pricingVersion is required');
  if (!model.status) errors.push('status is required');
  if (!model.updatedAt) errors.push('updatedAt is required');
  if (!model.projectionVersion) errors.push('projectionVersion is required');
  if (model.priceCount < 0) errors.push('priceCount must be >= 0');
  if (model.couponCount < 0) errors.push('couponCount must be >= 0');
  if (model.campaignCount < 0) errors.push('campaignCount must be >= 0');
  if (model.offerCount < 0) errors.push('offerCount must be >= 0');
  return errors;
}

export function validatePricingCatalogProjectionEventType(eventType: string): readonly string[] {
  if (!isSupportedPricingCatalogProjectionEvent(eventType)) {
    return [`Unsupported pricing catalog projection event: ${eventType}`];
  }
  return [];
}

export function assertNoForbiddenFieldsInPricingReadModel(
  record: Record<string, unknown>
): readonly string[] {
  const errors: string[] = [];
  for (const field of FORBIDDEN_READ_MODEL_FIELDS) {
    if (field in record && record[field] !== undefined) {
      errors.push(`Forbidden read model field: ${field}`);
    }
  }
  return errors;
}

export function canApplyPricingCatalogUpdate(
  existing: PricingCatalogProjectionReadModel | null
): boolean {
  return existing !== null;
}

export function canApplyPricingCatalogDelete(
  existing: PricingCatalogProjectionReadModel | null
): boolean {
  return existing !== null;
}
