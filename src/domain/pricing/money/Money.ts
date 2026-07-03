/**
 * Domain — Money and Currency (M8 PR-2).
 */

export type CurrencyCode = 'INR' | string;

export interface Money {
  readonly amount: number;
  readonly currency: CurrencyCode;
}

export interface Currency {
  readonly code: CurrencyCode;
  readonly symbol: string;
  readonly decimalPlaces: number;
}

export const INR_CURRENCY: Currency = {
  code: 'INR',
  symbol: '₹',
  decimalPlaces: 2,
};
