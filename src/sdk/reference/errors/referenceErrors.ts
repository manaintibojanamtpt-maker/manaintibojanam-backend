/**
 * ReferenceSDK — supplementary error codes (extends core SdkErrorCode at adapter layer).
 */

import type { SdkErrorCode } from '../../core/errors';
import type { ReferenceEntityKind } from '../types/branded';

export type ReferenceSdkErrorCode =
  | SdkErrorCode
  | 'REFERENCE_NOT_FOUND'
  | 'REFERENCE_INACTIVE'
  | 'REFERENCE_PARENT_MISMATCH'
  | 'REFERENCE_DATA_UNAVAILABLE';

export interface ReferenceSdkErrorDetails {
  readonly referenceCode?: ReferenceSdkErrorCode;
  readonly entityKind?: ReferenceEntityKind;
  readonly entityId?: string;
  readonly parentId?: string;
}
