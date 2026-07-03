/**
 * DiscoverySDK — branded types (M3 foundation).
 */

import type { IsoDateTime } from '../../core/types';

export type BranchId = string & { readonly __brand: 'BranchId' };
export type Geohash = string & { readonly __brand: 'Geohash' };
export type DiscoverySortBy = 'distance' | 'rating' | 'eta' | 'recommended';
export type DiscoveryTimestamp = IsoDateTime;

export type DiscoveryProviderKind = 'firestore' | 'tenant-scan' | 'stub';
