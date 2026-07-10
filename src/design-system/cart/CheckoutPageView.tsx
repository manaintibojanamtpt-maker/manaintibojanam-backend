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
    <TransactionalPageShell title={title} subtitle={subtitle}>
      {address && onAddressAction ? (
        <CheckoutDeliveryAddressView address={address} onAction={onAddressAction} />
      ) : null}

      {quoteLoading && !bill ? (
        <div aria-busy="true">
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : null}

      {bill ? <CheckoutBillSummaryView bill={bill} /> : null}

      <CheckoutContactView contact={contact} onChange={onContactChange} />

      {errorMessage ? (
        <p role="alert" className="text-sm text-red-300">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <SoftButton type="button" tone="secondary" disabled={actionsDisabled} onClick={onBack}>
          {backLabel}
        </SoftButton>

        {showCod && onPlaceCod ? (
          <SoftButton
            type="button"
            tone={showBothPaymentOptions ? 'secondary' : 'primary'}
            disabled={actionsDisabled}
            onClick={onPlaceCod}
          >
            {codBusy ? 'Placing order…' : codLabel}
          </SoftButton>
        ) : null}

        {showRazorpay && onPlaceRazorpay ? (
          <SoftButton type="button" disabled={actionsDisabled} onClick={onPlaceRazorpay}>
            {razorpayBusy ? 'Opening payment…' : razorpayLabel}
          </SoftButton>
        ) : null}
      </div>

      {hint ? <p className="text-sm text-white/60">{hint}</p> : null}
    </TransactionalPageShell>
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
