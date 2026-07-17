import { Skeleton } from '../primitives/Skeleton';
import { SoftButton } from '../primitives/SoftButton';
import { CheckoutBillSummaryView } from './CheckoutBillSummaryView';
import { CheckoutContactView } from './CheckoutContactView';
import { CheckoutDeliveryAddressView } from './CheckoutDeliveryAddressView';
import { CheckoutDeliverySlotView } from './CheckoutDeliverySlotView';
import { TransactionalPageShell } from './TransactionalPageShell';
import type {
  CheckoutBillSummaryViewModel,
  CheckoutContactViewModel,
  CheckoutDeliveryAddressViewModel,
  CheckoutDeliverySlotViewModel,
} from './types';

export interface CheckoutPageViewProps {
  readonly title: string;
  readonly subtitle: string;
  readonly address?: CheckoutDeliveryAddressViewModel;
  readonly onAddressAction?: () => void;
  readonly deliverySlot?: CheckoutDeliverySlotViewModel;
  readonly onDeliverySlotChange?: (slot: string) => void;
  readonly bill?: CheckoutBillSummaryViewModel;
  readonly quoteLoading: boolean;
  readonly billRefreshing?: boolean;
  readonly contact: CheckoutContactViewModel;
  readonly onContactChange: (value: string) => void;
  readonly errorMessage?: string;
  readonly backLabel: string;
  readonly onBack: () => void;
  readonly codLabel: string;
  readonly razorpayLabel: string;
  readonly codBusy: boolean;
  readonly razorpayBusy: boolean;
  readonly showCod: boolean;
  readonly showRazorpay: boolean;
  readonly actionsDisabled: boolean;
  readonly hint?: string;
  readonly onPlaceCod?: () => void;
  readonly onPlaceRazorpay?: () => void;
}

export function CheckoutPageView({
  title,
  subtitle,
  address,
  onAddressAction,
  deliverySlot,
  onDeliverySlotChange,
  bill,
  quoteLoading,
  billRefreshing = false,
  contact,
  onContactChange,
  errorMessage,
  backLabel,
  onBack,
  codLabel,
  razorpayLabel,
  codBusy,
  razorpayBusy,
  showCod,
  showRazorpay,
  actionsDisabled,
  hint,
  onPlaceCod,
  onPlaceRazorpay,
}: CheckoutPageViewProps) {
  const showBothPaymentOptions = showCod && showRazorpay;

  return (
    <div className="relative">
      <TransactionalPageShell title={title} subtitle={subtitle} className="!pb-[var(--ob-focus-bottom)]" embedded>
        {address && onAddressAction ? (
          <button
            type="button"
            className="w-full text-left touch-manipulation"
            onClick={onAddressAction}
            aria-label={`${address.label}: ${address.value}. ${address.actionLabel}`}
          >
            <CheckoutDeliveryAddressView address={address} />
          </button>
        ) : null}

        {deliverySlot && onDeliverySlotChange ? (
          <CheckoutDeliverySlotView slot={deliverySlot} onSelectSlot={onDeliverySlotChange} />
        ) : null}

        {quoteLoading && !bill ? (
          <div aria-busy="true" className="space-y-2">
            <Skeleton className="h-10 w-full rounded-xl ob-shimmer" />
            <Skeleton className="h-10 w-full rounded-xl ob-shimmer" />
            <p className="text-sm text-white/55">Calculating your bill…</p>
          </div>
        ) : null}

        {bill ? (
          <div className={billRefreshing ? 'opacity-80 transition-opacity' : undefined}>
            <CheckoutBillSummaryView bill={bill} />
            {billRefreshing ? (
              <p className="mt-2 text-xs text-white/50" aria-live="polite">
                Updating final bill…
              </p>
            ) : null}
          </div>
        ) : null}

        <CheckoutContactView contact={contact} onChange={onContactChange} />

        {errorMessage ? (
          <p role="alert" className="text-sm text-red-300">
            {errorMessage}
          </p>
        ) : null}

        {hint ? <p className="text-sm text-white/60">{hint}</p> : null}

        <SoftButton type="button" tone="ghost" size="compact" disabled={actionsDisabled} onClick={onBack}>
          {backLabel}
        </SoftButton>
      </TransactionalPageShell>

      <div className="ob-fixed-cta-bar">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          {showRazorpay && onPlaceRazorpay ? (
            <SoftButton type="button" fullWidth disabled={actionsDisabled} onClick={onPlaceRazorpay}>
              {razorpayBusy ? 'Opening payment…' : razorpayLabel}
            </SoftButton>
          ) : null}
          {showCod && onPlaceCod ? (
            <SoftButton
              type="button"
              fullWidth
              tone={showBothPaymentOptions ? 'secondary' : 'primary'}
              disabled={actionsDisabled}
              onClick={onPlaceCod}
            >
              {codBusy ? 'Placing order…' : codLabel}
            </SoftButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export interface CheckoutSuccessViewProps {
  readonly title: string;
  readonly subtitle: string;
  readonly trackLabel: string;
  readonly ordersLabel: string;
  readonly browseLabel: string;
  readonly onTrack: () => void;
  readonly onOrders: () => void;
  readonly onBrowse: () => void;
}

export function CheckoutSuccessView({
  title,
  subtitle,
  trackLabel,
  ordersLabel,
  browseLabel,
  onTrack,
  onOrders,
  onBrowse,
}: CheckoutSuccessViewProps) {
  return (
    <TransactionalPageShell title={title} subtitle={subtitle}>
      <div className="flex flex-wrap gap-3">
        <SoftButton type="button" onClick={onTrack}>
          {trackLabel}
        </SoftButton>
        <SoftButton type="button" tone="secondary" onClick={onOrders}>
          {ordersLabel}
        </SoftButton>
        <SoftButton type="button" tone="ghost" onClick={onBrowse}>
          {browseLabel}
        </SoftButton>
      </div>
    </TransactionalPageShell>
  );
}
