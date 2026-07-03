/**
 * MenuSDK — validation result DTOs (M7 PR-1).
 */

export interface MenuValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
}

export interface MenuValidationResult {
  readonly valid: boolean;
  readonly issues: readonly MenuValidationIssue[];
}
