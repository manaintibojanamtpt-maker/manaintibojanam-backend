/**
 * M5 PR-14 — pure view helpers for owner branch UI (no I/O).
 */

import type { BranchOperationsAvailabilityDto } from '../../sdk/branch/dto/operations';
import type { BranchETAEstimate, BranchValidationResult } from '../../sdk/branch/dto';
import type { BranchSummary } from '../../sdk/branch/dto/branch';
import type { OwnerBranchPresentationError } from './types';

export const formatBranchStatusLabel = (status: BranchSummary['status']): string => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'closed':
      return 'Closed';
    case 'suspended':
      return 'Suspended';
    case 'draft':
      return 'Draft';
    default:
      return String(status);
  }
};

export const formatOperationalAvailabilityLabel = (
  availability: BranchOperationsAvailabilityDto
): string =>
  availability.isOperationallyAvailable ? 'Operationally available' : 'Operationally unavailable';

export const formatValidationLabel = (validation: BranchValidationResult): string =>
  validation.isValid ? 'Serviceable' : 'Not serviceable';

export const formatEtaLabel = (estimate: BranchETAEstimate): string =>
  `${estimate.totalMins} min total (${estimate.prepTimeMins} prep + ${estimate.deliveryTimeMins} delivery)`;

export const formatOwnerBranchErrorMessage = (error: OwnerBranchPresentationError): string =>
  error.userMessage || error.message;

export const buildOwnerBranchListAriaLabel = (count: number): string =>
  count === 0 ? 'No branches found' : `${count} branch${count === 1 ? '' : 'es'} listed`;

export const buildOperationalStatusAriaLabel = (
  availability: BranchOperationsAvailabilityDto
): string => {
  const hours = availability.hours.isOpen ? 'open' : 'closed';
  const capacity = availability.capacity.isAvailable ? 'capacity available' : 'capacity limited';
  return `Branch is ${hours}, ${capacity}`;
};
