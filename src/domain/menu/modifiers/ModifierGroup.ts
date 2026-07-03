/**
 * Menu domain — modifier models (M7 PR-2).
 */

import type { PriceSnapshot } from '../pricing/PriceSnapshot';

export interface Modifier {
  readonly modifierId: string;
  readonly name: string;
  readonly price: PriceSnapshot;
  readonly active: boolean;
}

export interface ModifierGroup {
  readonly groupId: string;
  readonly name: string;
  readonly required: boolean;
  readonly minSelections: number;
  readonly maxSelections: number;
  readonly modifiers: readonly Modifier[];
}

export interface ModifierSelection {
  readonly groupId: string;
  readonly selectedModifierIds: readonly string[];
}
