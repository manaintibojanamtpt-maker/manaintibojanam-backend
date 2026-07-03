/**
 * Menu domain — category validator (M7 PR-2).
 */

import type { MenuCategory } from '../catalog/MenuCategory';
import { validateCategory } from '../catalog/catalogRules';
import type { MenuDomainValidationResult } from '../shared/MenuDomainResult';
import { toCategoryValidationError } from './MenuValidationErrors';

export const CategoryValidator = {
  validate(category: MenuCategory): MenuDomainValidationResult {
    const result = validateCategory(category);
    return {
      valid: result.valid,
      errors: result.errors.map(toCategoryValidationError),
    };
  },
};
