/**
 * Menu domain — combo validator (M7 PR-2).
 */

import type { Combo } from '../combos/Combo';
import { validateCombo } from '../combos/comboRules';
import type { MenuDomainValidationResult } from '../shared/MenuDomainResult';
import { toComboValidationError } from './MenuValidationErrors';

export const ComboValidator = {
  validate(combo: Combo): MenuDomainValidationResult {
    const result = validateCombo(combo);
    return {
      valid: result.valid,
      errors: result.errors.map(toComboValidationError),
    };
  },
};
