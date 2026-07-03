export type FailureReasonCode =
  | 'HANDLER_ERROR'
  | 'VALIDATION_ERROR'
  | 'SCHEMA_MISMATCH'
  | 'TIMEOUT'
  | 'MAX_RETRIES_EXCEEDED'
  | 'UNKNOWN';

export interface FailureReason {
  readonly code: FailureReasonCode;
  readonly message: string;
  readonly retryable: boolean;
}
