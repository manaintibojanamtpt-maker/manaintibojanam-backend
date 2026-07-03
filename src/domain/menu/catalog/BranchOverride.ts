/**
 * Menu domain — branch override model (M7 PR-2).
 */

import type { MenuAvailability } from '../availability/MenuAvailability';
import type { PriceSnapshot } from '../pricing/PriceSnapshot';

export interface BranchOverride {
  readonly branchId: string;
  readonly price?: PriceSnapshot;
  readonly availability?: MenuAvailability;
}
