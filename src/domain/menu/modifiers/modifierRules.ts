/**
 * Menu domain — modifier validation rules (M7 PR-2).
 */

import type { Modifier, ModifierGroup, ModifierSelection } from './ModifierGroup';
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

const hasDuplicateIds = (ids: readonly string[]): boolean => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return true;
    seen.add(id);
  }
  return false;
};

export const validateModifier = (modifier: Modifier): MenuDomainValidationResult => {
  const errors: MenuDomainError[] = [];
  if (!isNonEmptyString(modifier.modifierId)) {
    errors.push({
      code: MENU_REASON_CODES.EMPTY_MODIFIER_ID,
      message: 'Modifier ID is required',
      field: 'modifierId',
    });
  }
  if (!isNonEmptyString(modifier.name)) {
    errors.push({
      code: MENU_REASON_CODES.EMPTY_NAME,
      message: 'Name cannot be empty',
      field: 'name',
    });
  }
  const price = validatePriceSnapshot(modifier.price);
  return mergeValidationResults(
    errors.length === 0 ? menuValidationSuccess() : menuValidationFailure(errors),
    price
  );
};

export const validateModifierGroup = (group: ModifierGroup): MenuDomainValidationResult => {
  const errors: MenuDomainError[] = [];
  if (!isNonEmptyString(group.groupId)) {
    errors.push({
      code: MENU_REASON_CODES.EMPTY_GROUP_ID,
      message: 'Modifier group ID is required',
      field: 'groupId',
    });
  }
  if (!isNonEmptyString(group.name)) {
    errors.push({
      code: MENU_REASON_CODES.EMPTY_NAME,
      message: 'Name cannot be empty',
      field: 'name',
    });
  }
  if (
    !Number.isInteger(group.minSelections) ||
    !Number.isInteger(group.maxSelections) ||
    group.minSelections < 0 ||
    group.maxSelections < group.minSelections
  ) {
    errors.push({
      code: MENU_REASON_CODES.INVALID_SELECTION_RANGE,
      message: 'Modifier selection min/max range is invalid',
      field: 'minSelections',
    });
  }

  const activeModifiers = group.modifiers.filter((modifier) => modifier.active);
  if (group.required && activeModifiers.length === 0) {
    errors.push({
      code: MENU_REASON_CODES.REQUIRED_GROUP_EMPTY,
      message: 'Required modifier group has no active modifiers',
      field: 'modifiers',
    });
  }

  const duplicate = hasDuplicateIds(group.modifiers.map((modifier) => modifier.modifierId));
  if (duplicate) {
    errors.push({
      code: MENU_REASON_CODES.DUPLICATE_MODIFIER_ID,
      message: 'Duplicate modifier ID detected',
      field: 'modifiers',
    });
  }

  const modifierResults = group.modifiers.map((modifier) => validateModifier(modifier));
  return mergeValidationResults(
    errors.length === 0 ? menuValidationSuccess() : menuValidationFailure(errors),
    ...modifierResults
  );
};

export const validateModifierSelection = (
  group: ModifierGroup,
  selection: ModifierSelection
): MenuDomainValidationResult => {
  const errors: MenuDomainError[] = [];
  if (selection.groupId !== group.groupId) {
    errors.push({
      code: MENU_REASON_CODES.INVALID_SELECTION_RANGE,
      message: 'Selection group ID does not match modifier group',
      field: 'groupId',
    });
  }

  if (hasDuplicateIds(selection.selectedModifierIds)) {
    errors.push({
      code: MENU_REASON_CODES.DUPLICATE_MODIFIER_SELECTION,
      message: 'Duplicate modifier selection is not allowed',
      field: 'selectedModifierIds',
    });
  }

  const activeIds = new Set(
    group.modifiers.filter((modifier) => modifier.active).map((modifier) => modifier.modifierId)
  );
  for (const selectedId of selection.selectedModifierIds) {
    if (!activeIds.has(selectedId)) {
      errors.push({
        code: MENU_REASON_CODES.EMPTY_MODIFIER_ID,
        message: `Unknown or inactive modifier selected: ${selectedId}`,
        field: 'selectedModifierIds',
      });
    }
  }

  const count = selection.selectedModifierIds.length;
  if (count < group.minSelections) {
    errors.push({
      code: MENU_REASON_CODES.SELECTION_BELOW_MINIMUM,
      message: 'Modifier selection count is below minimum',
      field: 'selectedModifierIds',
    });
  }
  if (count > group.maxSelections) {
    errors.push({
      code: MENU_REASON_CODES.SELECTION_ABOVE_MAXIMUM,
      message: 'Modifier selection count exceeds maximum',
      field: 'selectedModifierIds',
    });
  }

  return errors.length === 0 ? menuValidationSuccess() : menuValidationFailure(errors);
};
