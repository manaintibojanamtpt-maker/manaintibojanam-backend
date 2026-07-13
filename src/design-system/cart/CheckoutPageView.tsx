import { Skeleton } from '../primitives/Skeleton';
import { SoftButton } from '../primitives/SoftButton';
import { CheckoutBillSummaryView } from './CheckoutBillSummaryView';
import { CheckoutContactView } from './CheckoutContactView';
import { CheckoutDeliveryAddressView } from './CheckoutDeliveryAddressView';
import { TransactionalPageShell } from './TransactionalPageShell';
import type {
  CheckoutBillSummaryViewModel,
  CheckoutContactViewModel,
  CheckoutDeliveryAddressViewModel,
} from './types';

export interface CheckoutPageViewProps {
  readonly title: string;
  readonly subtitle: string;
  readonly address?: CheckoutDeliveryAddressViewModel;
  readonly onAddressAction?: () => void;
  readonly bill?: CheckoutBillSummaryViewModel;
  readonly quoteLoading: boolean;
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
  bill,
  quoteLoading,
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
      <TransactionalPageShell title={title} subtitle={subtitle} className="!pb-36" embedded>
        {address && onAddressAction ? (
          <button
            type="button"
            className="w-full text-left touch-manipulation"
            onClick={onAddressAction}
            aria-label={`${address.label}: ${address.value}. ${address.actionLabel}`}
          >
            <CheckoutDeliveryAddressView address={address} onAction={onAddressAction} />
          </button>
        ) : null}

        {quoteLoading && !bill ? (
          <div aria-busy="true" className="space-y-2">
            <Skeleton className="h-48 w-full rounded-2xl ob-shimmer" />
            <p className="text-sm text-white/55">Calculating your bill…</p>
          </div>
        ) : null}

        {bill ? <CheckoutBillSummaryView bill={bill} /> : null}

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

      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#070504]/95 px-4 py-4 backdrop-blur-xl"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
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
