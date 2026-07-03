/**
 * Menu domain — availability validation rules (M7 PR-2).
 */

import { AVAILABILITY_STATES, type MenuAvailability } from './MenuAvailability';
import { MENU_REASON_CODES } from '../shared/MenuReasonCodes';
import {
  type MenuDomainValidationResult,
  menuValidationFailure,
  menuValidationSuccess,
} from '../shared/MenuDomainResult';

export const validateAvailability = (availability: MenuAvailability): MenuDomainValidationResult => {
  if (!AVAILABILITY_STATES.includes(availability.state)) {
    return menuValidationFailure([
      {
        code: MENU_REASON_CODES.INVALID_AVAILABILITY_STATE,
        message: 'Availability state is invalid',
        field: 'state',
      },
    ]);
  }
  return menuValidationSuccess();
};

export const aggregateComboAvailability = (
  componentAvailabilities: readonly MenuAvailability[]
): MenuAvailability => {
  if (componentAvailabilities.length === 0) {
    return { state: 'unavailable', reason: 'No components' };
  }
  if (componentAvailabilities.some((item) => item.state === 'hidden')) {
    return { state: 'hidden', reason: 'Component hidden' };
  }
  if (componentAvailabilities.some((item) => item.state === 'out_of_stock')) {
    return { state: 'out_of_stock', reason: 'Component out of stock' };
  }
  if (componentAvailabilities.some((item) => item.state === 'temporarily_unavailable')) {
    return { state: 'temporarily_unavailable', reason: 'Component temporarily unavailable' };
  }
  if (componentAvailabilities.every((item) => item.state === 'available')) {
    return { state: 'available' };
  }
  return { state: 'unavailable', reason: 'One or more components unavailable' };
};
