/**
 * Menu domain — item validator (M7 PR-2).
 */

import type { MenuItem } from '../catalog/MenuItem';
import { validateMenuItem } from '../catalog/catalogRules';
import type { MenuDomainValidationResult } from '../shared/MenuDomainResult';

export const ItemValidator = {
  validate(item: MenuItem): MenuDomainValidationResult {
    return validateMenuItem(item);
  },
};
