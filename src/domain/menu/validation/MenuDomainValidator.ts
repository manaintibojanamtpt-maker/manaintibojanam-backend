/**
 * Menu domain — catalog validator (M7 PR-2).
 */

import type { MenuCatalog } from '../catalog/MenuCatalog';
import { validateCatalog } from '../catalog/catalogRules';
import type { MenuDomainValidationResult } from '../shared/MenuDomainResult';
import { toMenuValidationError } from './MenuValidationErrors';

export const MenuDomainValidator = {
  validate(catalog: MenuCatalog): MenuDomainValidationResult {
    const result = validateCatalog(catalog);
    return {
      valid: result.valid,
      errors: result.errors.map(toMenuValidationError),
    };
  },
};
