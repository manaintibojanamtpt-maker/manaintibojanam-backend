/**
 * SearchSDK — repository index hit DTOs (M4 foundation).
 */

import type { TenantId } from '../../core/types';
import type { BranchId } from '../../discovery/types/branded';
import type { SearchMatchType } from '../types/branded';

export interface SearchIndexHit {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly matchType: Exclude<SearchMatchType, 'facet' | 'none'>;
  readonly field: string;
  readonly score: number;
  readonly snippet?: string;
}

export interface RestaurantSearchFilter {
  readonly text?: string;
  readonly limit?: number;
  readonly tenantIds?: readonly TenantId[];
}

export interface CuisineSearchFilter {
  readonly tags: readonly string[];
  readonly matchMode?: 'any' | 'all';
  readonly limit?: number;
  readonly tenantIds?: readonly TenantId[];
}

export interface FoodSearchFilter {
  readonly text?: string;
  readonly vegOnly?: boolean;
  readonly limit?: number;
  readonly tenantIds?: readonly TenantId[];
}

export interface AreaSearchFilter {
  readonly areaCode?: string;
  readonly localityName?: string;
  readonly cityName?: string;
  readonly pincode?: string;
  readonly districtName?: string;
  readonly limit?: number;
}

export interface TagSearchFilter {
  readonly tags: readonly string[];
  readonly matchMode?: 'any' | 'all';
  readonly limit?: number;
}
