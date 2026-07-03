/**
 * EventSDK — schema compatibility validation (M6 PR-2).
 */

import type { EventSchemaDefinition } from '../contracts/ports';
import type { SchemaVersion } from '../types/branded';
import type { SdkResult } from '../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';

export function validateSchemaCompatibility(
  definition: EventSchemaDefinition | null,
  schemaVersion: SchemaVersion
): SdkResult<boolean> {
  if (!definition) {
    return sdkFail(sdkError('SCHEMA_NOT_FOUND', 'No schema registered for event type/version'));
  }

  if (definition.schemaVersion !== schemaVersion) {
    const defMajor = definition.schemaVersion.split('.')[0];
    const reqMajor = schemaVersion.split('.')[0];
    if (defMajor !== reqMajor) {
      return sdkFail(
        sdkError(
          'SCHEMA_VERSION_MISMATCH',
          `Schema major version mismatch: registered=${definition.schemaVersion}, requested=${schemaVersion}`
        )
      );
    }
  }

  return sdkOk(true);
}
