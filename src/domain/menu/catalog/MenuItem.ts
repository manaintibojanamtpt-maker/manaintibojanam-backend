/**
 * Menu domain — menu item model (M7 PR-2).
 */

import type { MenuAvailability } from '../availability/MenuAvailability';
import type { PriceSnapshot } from '../pricing/PriceSnapshot';
import type { BranchOverride } from './BranchOverride';

export interface MenuItem {
  readonly itemId: string;
  readonly name: string;
  readonly description?: string;
  readonly categoryId: string;
  readonly price: PriceSnapshot;
  readonly availability: MenuAvailability;
  readonly modifierGroupIds?: readonly string[];
  readonly branchOverrides?: readonly BranchOverride[];
  readonly active: boolean;
}
