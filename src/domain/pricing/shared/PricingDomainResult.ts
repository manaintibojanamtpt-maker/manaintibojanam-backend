/**
 * Pricing domain — shared result helpers (M8 PR-2).
 */

import type { PricingReasonCode } from './PricingReasonCodes';
import { PRICING_REASON_MESSAGES } from './PricingReasonCodes';

export interface PricingDomainError {
  readonly code: PricingReasonCode | string;
  readonly message: string;
  readonly field?: string;
}

export interface PricingDomainOutcome<T> {
  readonly ok: true;
  readonly value: T;
}

export interface PricingDomainFailure {
  readonly ok: false;
  readonly error: PricingDomainError;
}

export type PricingDomainResult<T> = PricingDomainOutcome<T> | PricingDomainFailure;

export const pricingDomainOk = <T>(value: T): PricingDomainOutcome<T> => ({ ok: true, value });

export const pricingDomainFail = (
  code: PricingReasonCode | string,
  message?: string,
  field?: string
): PricingDomainFailure => ({
  ok: false,
  error: {
    code,
    message: message ?? (PRICING_REASON_MESSAGES[code as PricingReasonCode] ?? String(code)),
    field,
  },
});

export interface PricingDomainValidationResult {
  readonly valid: boolean;
  readonly errors: readonly PricingDomainError[];
}

export const pricingValidationSuccess = (): PricingDomainValidationResult => ({
  valid: true,
  errors: [],
});

export const pricingValidationFailure = (
  errors: readonly PricingDomainError[]
): PricingDomainValidationResult => ({
  valid: errors.length === 0,
  errors,
});

export const mergePricingValidationResults = (
  ...results: readonly PricingDomainValidationResult[]
): PricingDomainValidationResult => {
  const errors = results.flatMap((result) => result.errors);
  return pricingValidationFailure(errors);
};
