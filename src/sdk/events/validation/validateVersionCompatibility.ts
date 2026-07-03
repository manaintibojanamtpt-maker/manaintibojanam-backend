/**
 * EventSDK — version compatibility validation (M6 PR-2).
 */

import type { EventVersion } from '../dto/EventVersion';
import type { SdkResult } from '../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

export function validateVersionCompatibility(
  envelopeVersion: EventVersion,
  registeredVersion?: EventVersion
): SdkResult<EventVersion> {
  if (!SEMVER_PATTERN.test(envelopeVersion)) {
    return sdkFail(
      sdkError('SCHEMA_VERSION_MISMATCH', `Invalid envelope version: ${envelopeVersion}`)
    );
  }

  if (registeredVersion && envelopeVersion !== registeredVersion) {
    const envParts = envelopeVersion.split('.').map(Number);
    const regParts = registeredVersion.split('.').map(Number);
    if (envParts[0] !== regParts[0]) {
      return sdkFail(
        sdkError(
          'SCHEMA_VERSION_MISMATCH',
          `Major version mismatch: envelope=${envelopeVersion}, registered=${registeredVersion}`
        )
      );
    }
  }

  return sdkOk(envelopeVersion);
}
