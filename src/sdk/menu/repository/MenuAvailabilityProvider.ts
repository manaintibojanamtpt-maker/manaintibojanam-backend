/**
 * MenuAvailabilityProvider port (M7 PR-1) — contract only.
 */

import type { SdkAsyncResult } from '../../core/result';
import type { MenuItemId } from '../types/branded';
import type { AvailabilityReference } from '../dto';

export interface MenuAvailabilityQuery {
  readonly tenantId: string;
  readonly itemId: MenuItemId;
  readonly branchId?: string;
}

export interface MenuAvailabilityProvider {
  getAvailability(query: MenuAvailabilityQuery): SdkAsyncResult<AvailabilityReference>;
}
