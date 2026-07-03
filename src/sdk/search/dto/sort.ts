/**
 * SearchSDK — sort option DTOs (M4 foundation).
 */

import type { SearchSortBy } from '../types/branded';

export interface SortOption {
  readonly by: SearchSortBy;
  readonly direction?: 'asc' | 'desc';
}
