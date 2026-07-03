/**
 * Menu domain — combo model (M7 PR-2).
 */

import type { MenuAvailability } from '../availability/MenuAvailability';
import type { PriceSnapshot } from '../pricing/PriceSnapshot';

export interface ComboComponent {
  readonly itemId: string;
  readonly quantity: number;
  readonly required: boolean;
}

export interface Combo {
  readonly comboId: string;
  readonly name: string;
  readonly description?: string;
  readonly components: readonly ComboComponent[];
  readonly price: PriceSnapshot;
  readonly availability: MenuAvailability;
  readonly active: boolean;
}
