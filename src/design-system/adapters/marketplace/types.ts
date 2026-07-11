import type { LucideIcon } from 'lucide-react';

export interface MarketplaceNavItem {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly icon: LucideIcon;
}

export interface MarketplaceCartLineView {
  readonly id: string;
  readonly name: string;
  readonly priceLabel: string;
  readonly quantity: number;
}
