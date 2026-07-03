/**
 * LocationSDK — stub ReferenceProvider when ReferenceSDK is not wired (M2 PR-6).
 */

import type { ReferenceProvider } from '../providers/ReferenceProvider';
import { locationNotConfiguredAsync } from './notConfigured';
import { sdkError, sdkFail } from '../../core/resultHelpers';

export function createStubReferenceProvider(): ReferenceProvider {
  return {
    kind: 'stub',
    getStates: () => locationNotConfiguredAsync('getStates', 'StubReferenceProvider'),
    getDistricts: () => locationNotConfiguredAsync('getDistricts', 'StubReferenceProvider'),
    getCities: () => locationNotConfiguredAsync('getCities', 'StubReferenceProvider'),
    getAreas: () => locationNotConfiguredAsync('getAreas', 'StubReferenceProvider'),
    validatePincode: (pincode) =>
      sdkFail(
        sdkError('NOT_CONFIGURED', 'validatePincode is not configured on StubReferenceProvider', {
          locationCode: 'NOT_CONFIGURED',
          field: pincode,
        })
      ),
  };
}
