/**
 * MenuSDK — combo DTOs (M7 PR-1).
 */

import type { ComboId, MenuItemId } from '../types/branded';
import type { PriceReference } from './references';
import type { AvailabilityReference } from './references';

export interface ComboComponent {
  readonly itemId: MenuItemId;
  readonly quantity: number;
}

export interface Combo {
  readonly comboId: ComboId;
  readonly name: string;
  readonly description?: string;
  readonly components: readonly ComboComponent[];
  readonly price: PriceReference;
  readonly availability: AvailabilityReference;
  readonly active: boolean;
}
