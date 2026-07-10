export type TrackingTimelineIcon =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'delivery'
  | 'delivered'
  | 'cancelled';

export type TrackingTimelineStepState = 'done' | 'active' | 'pending' | 'cancelled';

export interface TrackingTimelineStepViewModel {
  readonly id: string;
  readonly label: string;
  readonly message?: string;
  readonly timestampLabel?: string;
  readonly state: TrackingTimelineStepState;
  readonly icon: TrackingTimelineIcon;
}

export interface TrackingHeroViewModel {
  readonly statusLabel: string;
  readonly kitchenName?: string;
  readonly orderNumberLabel: string;
  readonly etaLabel?: string;
  readonly liveLabel?: string;
  readonly liveActive: boolean;
  readonly showLive: boolean;
}

export interface TrackingDeliveryViewModel {
  readonly partner?: string;
  readonly riderName?: string;
  readonly riderPhone?: string;
  readonly trackingUrl?: string;
  readonly trackButtonLabel: string;
}

export interface TrackingInvoiceLineViewModel {
  readonly id: string;
  readonly name: string;
  readonly quantityLabel: string;
  readonly rateLabel: string;
  readonly totalLabel: string;
}

export interface TrackingInvoiceTotalLineViewModel {
  readonly label: string;
  readonly amountLabel: string;
  readonly emphasis?: boolean;
}

export interface TrackingInvoiceViewModel {
  readonly kitchenName: string;
  readonly orderNumberLabel: string;
  readonly customerName: string;
  readonly createdLabel: string;
  readonly paymentBadgeLabel: string;
  readonly paymentBadgeTone: 'paid' | 'pending' | 'failed';
  readonly phoneLabel?: string;
  readonly addressLabel?: string;
  readonly paymentMethodLabel?: string;
  readonly items: readonly TrackingInvoiceLineViewModel[];
  readonly totals: readonly TrackingInvoiceTotalLineViewModel[];
  readonly footerNote: string;
}

export interface TrackingFeedbackViewModel {
  readonly title: string;
  readonly description: string;
  readonly rating: number;
  readonly comment: string;
  readonly submitted: boolean;
  readonly submittedSummary?: string;
  readonly submitLabel: string;
  readonly submitting: boolean;
  readonly eligible: boolean;
}
