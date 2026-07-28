import type { ReactNode } from 'react';
import { Skeleton } from '../primitives/Skeleton';
import { SoftButton } from '../primitives/SoftButton';
import { CheckoutBillSummaryView } from './CheckoutBillSummaryView';
import { CheckoutContactView } from './CheckoutContactView';
import { CheckoutDeliveryAddressView } from './CheckoutDeliveryAddressView';
import { CheckoutDeliverySlotView } from './CheckoutDeliverySlotView';
import { CheckoutPromoView } from './CheckoutPromoView';
import { TransactionalPageShell } from './TransactionalPageShell';
import type {
  CheckoutBillSummaryViewModel,
  CheckoutContactViewModel,
  CheckoutDeliveryAddressViewModel,
  CheckoutDeliverySlotViewModel,
  CheckoutPromoViewModel,
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
  readonly onContactEmailChange?: (value: string) => void;
  readonly promo?: CheckoutPromoViewModel;
  readonly onPromoChange?: (value: string) => void;
  readonly onPromoApply?: () => void;
  readonly onPromoSelectChip?: (code: string) => void;
  readonly onPromoClear?: () => void;
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

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.08] bg-[#120d0c] p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)] ${className}`.trim()}
    >
      {children}
    </div>
  );
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
  onContactEmailChange,
  promo,
  onPromoChange,
  onPromoApply,
  onPromoSelectChip,
  onPromoClear,
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
      <TransactionalPageShell
        title={title}
        subtitle={subtitle}
        className="!gap-3 !pb-[var(--ob-focus-bottom)]"
        embedded
      >
        <header className="px-0.5">
          <h1 className="text-xl font-extrabold tracking-tight text-[#fff8f0]">{title}</h1>
          <p className="mt-0.5 text-xs text-[#c4b5a5]">{subtitle}</p>
        </header>

        {address && onAddressAction ? (
          <Card>
            <button
              type="button"
              className="w-full text-left touch-manipulation"
              onClick={onAddressAction}
              aria-label={`${address.label}: ${address.value}. ${address.actionLabel}`}
            >
              <CheckoutDeliveryAddressView address={address} />
            </button>
          </Card>
        ) : null}

        {deliverySlot && onDeliverySlotChange ? (
          <Card>
            <CheckoutDeliverySlotView slot={deliverySlot} onSelectSlot={onDeliverySlotChange} />
          </Card>
        ) : null}

        <Card>
          {quoteLoading && !bill ? (
            <div aria-busy="true" className="space-y-2">
              <Skeleton className="h-8 w-full rounded-xl ob-shimmer" />
              <Skeleton className="h-8 w-2/3 rounded-xl ob-shimmer" />
              <p className="text-xs text-[#c4b5a5]">Updating taxes and delivery…</p>
            </div>
          ) : null}

          {bill ? (
            <div className={billRefreshing ? 'opacity-80 transition-opacity' : undefined}>
              <CheckoutBillSummaryView bill={bill} />
              {billRefreshing ? (
                <p className="mt-2 text-xs text-[#c4b5a5]" aria-live="polite">
                  Updating taxes and delivery…
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>

        {promo && onPromoChange && onPromoApply && onPromoSelectChip ? (
          <Card>
            <CheckoutPromoView
              promo={promo}
              onChange={onPromoChange}
              onApply={onPromoApply}
              onSelectChip={onPromoSelectChip}
              onClear={onPromoClear}
            />
          </Card>
        ) : null}

        <Card>
          <CheckoutContactView
            contact={contact}
            onChange={onContactChange}
            onEmailChange={onContactEmailChange}
          />
        </Card>

        {errorMessage ? (
          <p role="alert" className="text-sm text-red-300">
            {errorMessage}
          </p>
        ) : null}

        {hint ? <p className="px-0.5 text-xs leading-relaxed text-[#c4b5a5]">{hint}</p> : null}

        <SoftButton type="button" tone="ghost" size="compact" disabled={actionsDisabled} onClick={onBack}>
          {backLabel}
        </SoftButton>
      </TransactionalPageShell>

      <div className="ob-fixed-cta-bar">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          {bill?.totalLabel ? (
            <div className="flex items-center justify-between px-0.5 text-sm">
              <span className="font-medium text-white/60">Total</span>
              <span className="font-extrabold text-[#fff8f0]">{bill.totalLabel}</span>
            </div>
          ) : null}
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
    <TransactionalPageShell title={title} subtitle={subtitle} embedded>
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
