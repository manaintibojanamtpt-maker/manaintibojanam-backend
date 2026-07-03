/**
 * Menu domain — combo validation rules (M7 PR-2).
 */

import type { Combo } from './Combo';
import { aggregateComboAvailability } from '../availability/availabilityRules';
import type { MenuAvailability } from '../availability/MenuAvailability';
import { validateAvailability } from '../availability/availabilityRules';
import { validatePriceSnapshot } from '../pricing/pricingRules';
import { MENU_REASON_CODES } from '../shared/MenuReasonCodes';
import {
  mergeValidationResults,
  type MenuDomainError,
  type MenuDomainValidationResult,
  menuValidationFailure,
  menuValidationSuccess,
} from '../shared/MenuDomainResult';

const isNonEmptyString = (value: string | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const validateCombo = (combo: Combo): MenuDomainValidationResult => {
  const errors: MenuDomainError[] = [];

  if (!isNonEmptyString(combo.comboId)) {
    errors.push({
      code: MENU_REASON_CODES.EMPTY_COMBO_ID,
      message: 'Combo ID is required',
      field: 'comboId',
    });
  }
  if (!isNonEmptyString(combo.name)) {
    errors.push({
      code: MENU_REASON_CODES.EMPTY_NAME,
      message: 'Name cannot be empty',
      field: 'name',
    });
  }
  if (combo.components.length === 0) {
    errors.push({
      code: MENU_REASON_CODES.COMBO_EMPTY_COMPONENTS,
      message: 'Combo must have at least one component',
      field: 'components',
    });
  }

  for (const component of combo.components) {
    if (!isNonEmptyString(component.itemId)) {
      errors.push({
        code: MENU_REASON_CODES.EMPTY_ITEM_ID,
        message: 'Combo component item ID is required',
        field: 'components',
      });
    }
    if (!Number.isInteger(component.quantity) || component.quantity <= 0) {
      errors.push({
        code: MENU_REASON_CODES.COMBO_INVALID_QUANTITY,
        message: 'Combo component quantity must be positive',
        field: 'components',
      });
    }
  }

  const requiredComponents = combo.components.filter((component) => component.required);
  if (combo.components.length > 0 && requiredComponents.length === 0) {
    errors.push({
      code: MENU_REASON_CODES.COMBO_MISSING_REQUIRED_COMPONENT,
      message: 'Combo should declare at least one required component',
      field: 'components',
    });
  }

  const price = validatePriceSnapshot(combo.price);
  const availability = validateAvailability(combo.availability);

  return mergeValidationResults(
    errors.length === 0 ? menuValidationSuccess() : menuValidationFailure(errors),
    price,
    availability
  );
};

export const resolveComboAvailabilityFromComponents = (
  componentAvailabilities: readonly MenuAvailability[]
): MenuAvailability => aggregateComboAvailability(componentAvailabilities);
