export interface CartLineAddonViewModel {
  readonly id: string;
  readonly label: string;
  readonly price: number;
}

export interface CartLineViewModel {
  readonly lineId: string;
  readonly name: string;
  readonly variantLabel?: string;
  readonly addons?: readonly CartLineAddonViewModel[];
  readonly instructions?: string;
  readonly priceLabel: string;
  readonly totalLabel: string;
  readonly quantity: number;
}

export interface CartRestaurantBannerViewModel {
  readonly name: string;
  readonly meta: string;
  readonly menuActionLabel: string;
}

export interface CartSummaryViewModel {
  readonly subtotalLabel: string;
  readonly itemCountLabel: string;
}

export interface CheckoutBillLineViewModel {
  readonly label: string;
  readonly amountLabel: string;
}

export interface CheckoutBillSummaryViewModel {
  readonly lines: readonly CheckoutBillLineViewModel[];
  readonly totalLabel: string;
  readonly deliveryPendingNote?: string;
}

export interface CheckoutDeliveryAddressViewModel {
  readonly label: string;
  readonly value: string;
  readonly loading: boolean;
  readonly actionLabel: string;
}

export interface CheckoutContactViewModel {
  readonly value: string;
  readonly error?: string;
  readonly hint: string;
  readonly emailValue?: string;
  readonly emailHint?: string;
  readonly emailError?: string;
}

export interface CheckoutDeliverySlotViewModel {
  readonly slots: readonly string[];
  readonly selectedSlot: string;
  readonly selectedIsAsap: boolean;
  readonly selectedSummary?: string;
  readonly closedMessage?: string;
  /** Voice clarify / unmatched schedule — shown beside kitchen closed copy. */
  readonly voiceScheduleNotice?: string;
  readonly voiceScheduleNoticeKind?: 'clarify' | 'error' | 'applied';
  readonly isAsap: (slot: string) => boolean;
  readonly formatLabel: (slot: string) => string;
}

export interface CheckoutPromoChipViewModel {
  readonly code: string;
  readonly label: string;
  readonly minOrder?: number;
}

export interface CheckoutPromoViewModel {
  readonly value: string;
  readonly appliedCode?: string;
  readonly chips: readonly CheckoutPromoChipViewModel[];
  readonly hint?: string;
  readonly error?: string;
  readonly busy?: boolean;
}
