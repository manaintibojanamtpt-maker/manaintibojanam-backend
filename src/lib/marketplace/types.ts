/**
 * M3 PR-8 — Marketplace home presentation types.
 * View models only — no discovery business logic in React.
 */

import type { DiscoveryPresentationError } from '../discovery/types';

export type MarketplaceHomeStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'
  | 'location_required'
  | 'location_denied'
  | 'location_unavailable'
  | 'disabled';

export interface MarketplaceBadge {
  readonly id:
    | 'closest'
    | 'fast_delivery'
    | 'highly_rated'
    | 'within_delivery_radius'
    | 'offer'
    | 'closed'
    | 'kitchen_format';
  readonly label: string;
}

export interface MarketplaceKitchenCard {
  readonly tenantId: string;
  readonly slug: string;
  readonly name: string;
  readonly distanceKm?: number;
  readonly etaMins?: number;
  readonly rating?: number;
  readonly cuisineTags?: readonly string[];
  readonly thumbnailUrl?: string;
  readonly isOpen: boolean;
  readonly isServiceable: boolean;
  readonly eligibilityLabel: string;
  readonly deliveryFeeLabel?: string;
  readonly badges: readonly MarketplaceBadge[];
  readonly storePath: string;
}

export interface MarketplaceHomeViewModel {
  readonly status: MarketplaceHomeStatus;
  readonly locationLabel?: string;
  readonly kitchens: readonly MarketplaceKitchenCard[];
  readonly totalCandidates?: number;
  readonly error?: DiscoveryPresentationError;
  readonly retryable?: boolean;
}

export interface MarketplaceHomeSuccess {
  readonly ok: true;
  readonly view: MarketplaceHomeViewModel;
}

export interface MarketplaceHomeFailure {
  readonly ok: false;
  readonly view: MarketplaceHomeViewModel;
}

export type MarketplaceHomeOutcome = MarketplaceHomeSuccess | MarketplaceHomeFailure;
