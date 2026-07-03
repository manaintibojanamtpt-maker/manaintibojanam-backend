/**
 * Menu domain — validation error types (M7 PR-2).
 */

import type { MenuDomainError } from '../shared/MenuDomainResult';

export interface MenuValidationError extends MenuDomainError {
  readonly domain: 'menu';
}

export interface CategoryValidationError extends MenuDomainError {
  readonly domain: 'category';
}

export interface ModifierValidationError extends MenuDomainError {
  readonly domain: 'modifier';
}

export interface ComboValidationError extends MenuDomainError {
  readonly domain: 'combo';
}

export const toMenuValidationError = (error: MenuDomainError): MenuValidationError => ({
  ...error,
  domain: 'menu',
});

export const toCategoryValidationError = (error: MenuDomainError): CategoryValidationError => ({
  ...error,
  domain: 'category',
});

export const toModifierValidationError = (error: MenuDomainError): ModifierValidationError => ({
  ...error,
  domain: 'modifier',
});

export const toComboValidationError = (error: MenuDomainError): ComboValidationError => ({
  ...error,
  domain: 'combo',
});
