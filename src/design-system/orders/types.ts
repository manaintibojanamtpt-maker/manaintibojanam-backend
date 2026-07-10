export interface OrderSummaryCardViewModel {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly displayName: string;
  readonly statusLabel: string;
  readonly statusTone: 'active' | 'complete' | 'cancelled';
  readonly totalLabel: string;
  readonly dateLabel: string;
  readonly trackLabel: string;
  readonly ariaLabel: string;
}
