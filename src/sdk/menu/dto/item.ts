/**
 * MenuSDK — menu item DTOs (M7 PR-1).
 */

import type { MenuItemId, MenuItemKind } from '../types/branded';
import type { PriceReference } from './references';
import type { AvailabilityReference } from './references';
import type { BranchOverrideReference } from './references';

export interface MenuItem {
  readonly itemId: MenuItemId;
  readonly name: string;
  readonly description?: string;
  readonly kind: MenuItemKind;
  readonly categoryId: string;
  readonly price: PriceReference;
  readonly availability: AvailabilityReference;
  readonly branchOverrides?: readonly BranchOverrideReference[];
  readonly modifierGroupIds?: readonly string[];
  readonly tags?: readonly string[];
  readonly active: boolean;
}
