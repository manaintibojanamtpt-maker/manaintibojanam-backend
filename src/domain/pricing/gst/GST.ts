/**
 * Domain — GST types (M8 PR-2).
 * Validation only — no tax engine.
 */

export type GSTCategoryCode = 'goods' | 'services' | 'restaurant' | string;

export interface GSTCategory {
  readonly code: GSTCategoryCode;
  readonly label: string;
  readonly hsnSac?: string;
}

export interface GSTRate {
  readonly categoryCode: GSTCategoryCode;
  readonly cgstPercent: number;
  readonly sgstPercent: number;
  readonly igstPercent: number;
  readonly cessPercent?: number;
}

export interface GSTBreakdown {
  readonly rate: GSTRate;
  readonly taxableAmount: number;
  readonly cgstAmount: number;
  readonly sgstAmount: number;
  readonly igstAmount: number;
  readonly cessAmount?: number;
}

export type TaxComponent = 'CGST' | 'SGST' | 'IGST' | 'CESS';

export interface TaxRate {
  readonly component: TaxComponent;
  readonly percent: number;
}
