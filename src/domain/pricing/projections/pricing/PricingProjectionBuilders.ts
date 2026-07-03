/**
 * Pricing catalog shadow projection builders (M8 PR-7).
 * Pure domain — no infrastructure imports.
 */

import {
  PRICING_CATALOG_EVENT_TYPES,
  PRICING_CATALOG_READ_PROJECTION_VERSION,
  type PricingCatalogCreatedPayload,
  type PricingCatalogDeletedPayload,
  type PricingCatalogUpdatedPayload,
} from './PricingProjectionMetadata';
import type { PricingCatalogProjectionReadModel } from './PricingProjectionState';

export interface PricingCatalogProjectionEventContext {
  readonly eventId: string;
  readonly eventType: string;
  readonly schemaVersion: string;
  readonly occurredAt: string;
  readonly branchId?: string;
}

export function buildPricingCatalogProjectionFromCreated(
  payload: PricingCatalogCreatedPayload,
  context: PricingCatalogProjectionEventContext
): PricingCatalogProjectionReadModel {
  return {
    priceListId: payload.priceListId,
    tenantId: payload.tenantId,
    branchId: context.branchId,
    pricingVersion: payload.pricingVersion,
    status: payload.status,
    priceCount: payload.priceCount,
    couponCount: payload.couponCount,
    campaignCount: payload.campaignCount,
    offerCount: payload.offerCount,
    updatedAt: context.occurredAt,
    projectionVersion: PRICING_CATALOG_READ_PROJECTION_VERSION,
  };
}

export function applyPricingCatalogProjectionUpdated(
  current: PricingCatalogProjectionReadModel,
  payload: PricingCatalogUpdatedPayload,
  context: PricingCatalogProjectionEventContext
): PricingCatalogProjectionReadModel {
  return {
    ...current,
    branchId: context.branchId ?? current.branchId,
    pricingVersion: payload.pricingVersion,
    status: payload.status ?? current.status,
    priceCount: payload.priceCount ?? current.priceCount,
    couponCount: payload.couponCount ?? current.couponCount,
    campaignCount: payload.campaignCount ?? current.campaignCount,
    offerCount: payload.offerCount ?? current.offerCount,
    updatedAt: context.occurredAt,
    projectionVersion: PRICING_CATALOG_READ_PROJECTION_VERSION,
  };
}

export function applyPricingCatalogProjectionDeleted(
  current: PricingCatalogProjectionReadModel,
  payload: PricingCatalogDeletedPayload,
  context: PricingCatalogProjectionEventContext
): PricingCatalogProjectionReadModel {
  return {
    ...current,
    branchId: context.branchId ?? current.branchId,
    pricingVersion: payload.pricingVersion ?? current.pricingVersion,
    status: payload.status,
    updatedAt: context.occurredAt,
    projectionVersion: PRICING_CATALOG_READ_PROJECTION_VERSION,
  };
}

export function resolvePricingCatalogProjectionTransition(
  eventType: string
): 'create' | 'update' | 'delete' | 'unsupported' {
  switch (eventType) {
    case PRICING_CATALOG_EVENT_TYPES.CREATED:
      return 'create';
    case PRICING_CATALOG_EVENT_TYPES.UPDATED:
      return 'update';
    case PRICING_CATALOG_EVENT_TYPES.DELETED:
      return 'delete';
    default:
      return 'unsupported';
  }
}
