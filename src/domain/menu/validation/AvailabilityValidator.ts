/**
 * Menu domain — availability validator (M7 PR-2).
 */

import type { MenuAvailability } from '../availability/MenuAvailability';
import {
  aggregateComboAvailability,
  validateAvailability,
} from '../availability/availabilityRules';
import type { MenuDomainValidationResult } from '../shared/MenuDomainResult';

export const AvailabilityValidator = {
  validate(availability: MenuAvailability): MenuDomainValidationResult {
    return validateAvailability(availability);
  },

  aggregateComponentAvailability(
    componentAvailabilities: readonly MenuAvailability[]
  ): MenuAvailability {
    return aggregateComboAvailability(componentAvailabilities);
  },
};
