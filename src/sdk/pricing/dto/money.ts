/**
 * PricingSDK DTOs — money and currency (M8 PR-1).
 */

export type CurrencyCode = 'INR' | string;

export interface Money {
  readonly amount: number;
  readonly currency: CurrencyCode;
}

export interface MoneyLine {
  readonly label: string;
  readonly amount: Money;
}
