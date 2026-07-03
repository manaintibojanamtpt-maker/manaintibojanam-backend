/**
 * Domain — Money builder (M8 PR-2).
 * Immutable builder — each step returns a new instance.
 */

import type { CurrencyCode, Money } from './Money';

export class MoneyBuilder {
  private constructor(
    private readonly amount: number,
    private readonly currency: CurrencyCode
  ) {}

  static zero(currency: CurrencyCode = 'INR'): MoneyBuilder {
    return new MoneyBuilder(0, currency);
  }

  static from(money: Money): MoneyBuilder {
    return new MoneyBuilder(money.amount, money.currency);
  }

  withAmount(amount: number): MoneyBuilder {
    return new MoneyBuilder(amount, this.currency);
  }

  withCurrency(currency: CurrencyCode): MoneyBuilder {
    return new MoneyBuilder(this.amount, currency);
  }

  build(): Money {
    return Object.freeze({ amount: this.amount, currency: this.currency });
  }
}

export const buildMoney = (amount: number, currency: CurrencyCode = 'INR'): Money =>
  MoneyBuilder.zero(currency).withAmount(amount).build();
