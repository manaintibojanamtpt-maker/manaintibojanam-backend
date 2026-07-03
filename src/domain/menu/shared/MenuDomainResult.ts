/**
 * Menu domain — shared result helpers (M7 PR-2).
 */

import type { MenuReasonCode } from './MenuReasonCodes';
import { MENU_REASON_MESSAGES } from './MenuReasonCodes';

export interface MenuDomainError {
  readonly code: MenuReasonCode | string;
  readonly message: string;
  readonly field?: string;
}

export interface MenuDomainOutcome<T> {
  readonly ok: true;
  readonly value: T;
}

export interface MenuDomainFailure {
  readonly ok: false;
  readonly error: MenuDomainError;
}

export type MenuDomainResult<T> = MenuDomainOutcome<T> | MenuDomainFailure;

export const menuDomainOk = <T>(value: T): MenuDomainOutcome<T> => ({ ok: true, value });

export const menuDomainFail = (
  code: MenuReasonCode | string,
  message?: string,
  field?: string
): MenuDomainFailure => ({
  ok: false,
  error: {
    code,
    message: message ?? (MENU_REASON_MESSAGES[code as MenuReasonCode] ?? String(code)),
    field,
  },
});

export interface MenuDomainValidationResult {
  readonly valid: boolean;
  readonly errors: readonly MenuDomainError[];
}

export const menuValidationSuccess = (): MenuDomainValidationResult => ({
  valid: true,
  errors: [],
});

export const menuValidationFailure = (
  errors: readonly MenuDomainError[]
): MenuDomainValidationResult => ({
  valid: errors.length === 0,
  errors,
});

export const mergeValidationResults = (
  ...results: readonly MenuDomainValidationResult[]
): MenuDomainValidationResult => {
  const errors = results.flatMap((result) => result.errors);
  return menuValidationFailure(errors);
};
