/**
 * MenuSDK — modifier DTOs (M7 PR-1).
 */

import type { ModifierGroupId, ModifierId } from '../types/branded';
import type { PriceReference } from './references';

export interface Modifier {
  readonly modifierId: ModifierId;
  readonly name: string;
  readonly price: PriceReference;
  readonly active: boolean;
}

export interface ModifierGroup {
  readonly groupId: ModifierGroupId;
  readonly name: string;
  readonly required: boolean;
  readonly minSelections: number;
  readonly maxSelections: number;
  readonly modifiers: readonly Modifier[];
}
