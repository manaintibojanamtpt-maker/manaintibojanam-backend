/**
 * Menu domain — modifier validator (M7 PR-2).
 */

import type { Modifier, ModifierGroup, ModifierSelection } from '../modifiers/ModifierGroup';
import {
  validateModifier,
  validateModifierGroup,
  validateModifierSelection,
} from '../modifiers/modifierRules';
import type { MenuDomainValidationResult } from '../shared/MenuDomainResult';
import { toModifierValidationError } from './MenuValidationErrors';

export const ModifierValidator = {
  validateModifier(modifier: Modifier): MenuDomainValidationResult {
    const result = validateModifier(modifier);
    return {
      valid: result.valid,
      errors: result.errors.map(toModifierValidationError),
    };
  },

  validateGroup(group: ModifierGroup): MenuDomainValidationResult {
    const result = validateModifierGroup(group);
    return {
      valid: result.valid,
      errors: result.errors.map(toModifierValidationError),
    };
  },

  validateSelection(group: ModifierGroup, selection: ModifierSelection): MenuDomainValidationResult {
    const result = validateModifierSelection(group, selection);
    return {
      valid: result.valid,
      errors: result.errors.map(toModifierValidationError),
    };
  },
};
