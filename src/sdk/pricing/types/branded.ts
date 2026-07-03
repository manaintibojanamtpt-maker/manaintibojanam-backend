/**
 * PricingSDK — branded identifiers (M8 PR-1).
 */

import type { TenantId } from '../../core/types';

export type PriceListId = string & { readonly __brand: 'PriceListId' };
export type CouponCode = string & { readonly __brand: 'CouponCode' };
export type CampaignId = string & { readonly __brand: 'CampaignId' };
export type OfferId = string & { readonly __brand: 'OfferId' };
export type BranchId = string & { readonly __brand: 'BranchId' };
export type MenuItemId = string & { readonly __brand: 'MenuItemId' };

export type { TenantId };
