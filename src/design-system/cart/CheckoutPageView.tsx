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

export type CheckoutPaymentMethodId = 'upi' | 'cod' | 'razorpay';

export interface CheckoutPaymentOptionViewModel {
  readonly id: CheckoutPaymentMethodId;
  readonly title: string;
  readonly subtitle: string;
  readonly badge?: string;
}

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
  /** Zomato-style payment method cards — always visible once options are known. */
  readonly paymentOptions: readonly CheckoutPaymentOptionViewModel[];
  readonly selectedPaymentMethod: CheckoutPaymentMethodId | null;
  readonly onSelectPaymentMethod: (id: CheckoutPaymentMethodId) => void;
  readonly placeOrderLabel: string;
  readonly placeOrderBusy: boolean;
  readonly onPlaceOrder: () => void;
  readonly actionsDisabled: boolean;
  readonly hint?: string;
  readonly paymentMethodsLoading?: boolean;
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

function PaymentMethodIcon({ id }: { readonly id: CheckoutPaymentMethodId }) {
  if (id === 'upi') {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5f2eea]/20 text-[11px] font-black tracking-tight text-[#c4b5ff]">
        UPI
      </span>
    );
  }
  if (id === 'razorpay') {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3395ff]/20 text-[10px] font-black text-[#9ec9ff]">
        Pay
      </span>
    );
  }
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e85d04]/15 text-[10px] font-black text-[#f4a261]">
      COD
    </span>
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
  paymentOptions,
  selectedPaymentMethod,
  onSelectPaymentMethod,
  placeOrderLabel,
  placeOrderBusy,
  onPlaceOrder,
  actionsDisabled,
  hint,
  paymentMethodsLoading = false,
}: CheckoutPageViewProps) {
  return (
    <div className="relative">
      <TransactionalPageShell
        title={title}
        subtitle={subtitle}
        className="!gap-3 !pb-[calc(var(--ob-focus-bottom)+1.25rem)]"
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

        {/* Pay using sits above promo/contact so methods stay visible without scrolling. */}
        <Card className="!p-3" data-testid="checkout-pay-using">
          <div className="mb-2.5 px-0.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#f4a261]/90">
              Pay using
            </p>
            <p className="mt-0.5 text-sm font-extrabold text-[#fff8f0]">Choose a payment method</p>
          </div>

          {paymentMethodsLoading && paymentOptions.length === 0 ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-16 w-full rounded-xl ob-shimmer" />
              <Skeleton className="h-16 w-full rounded-xl ob-shimmer" />
            </div>
          ) : (
            <fieldset className="m-0 flex list-none flex-col gap-2 border-0 p-0">
              <legend className="sr-only">Payment method</legend>
              {paymentOptions.map((option) => {
                const selected = selectedPaymentMethod === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left touch-manipulation transition-colors ${
                      selected
                        ? 'border-[#e85d04]/55 bg-[#e85d04]/10 shadow-[0_0_0_1px_rgba(232,93,4,0.25)]'
                        : 'border-white/[0.1] bg-black/20 hover:border-white/20'
                    }`}
                    onClick={() => onSelectPaymentMethod(option.id)}
                  >
                    <PaymentMethodIcon id={option.id} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#fff8f0]">{option.title}</span>
                        {option.badge ? (
                          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#f4a261]">
                            {option.badge}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-[#c4b5a5]">
                        {option.subtitle}
                      </span>
                    </span>
                    <span
                      className={`mt-1 h-5 w-5 shrink-0 rounded-full border-2 ${
                        selected
                          ? 'border-[#e85d04] bg-[#e85d04] shadow-[inset_0_0_0_3px_#120d0c]'
                          : 'border-white/25 bg-transparent'
                      }`}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </fieldset>
          )}
        </Card>

        {hint ? <p className="px-0.5 text-xs leading-relaxed text-[#c4b5a5]">{hint}</p> : null}

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

        <SoftButton type="button" tone="ghost" size="compact" onClick={onBack}>
          {backLabel}
        </SoftButton>
      </TransactionalPageShell>

      <div className="ob-fixed-cta-bar">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          <p className="px-0.5 text-[10px] font-semibold tracking-wide text-[#f4a261]/90">
            ₹0 platform fee · No hidden charges
          </p>
          {bill?.totalLabel ? (
            <div className="flex items-center justify-between px-0.5 text-sm">
              <span className="font-medium text-white/60">Total</span>
              <span className="font-extrabold text-[#fff8f0]">{bill.totalLabel}</span>
            </div>
          ) : null}
          <SoftButton
            type="button"
            fullWidth
            disabled={actionsDisabled || !selectedPaymentMethod || paymentOptions.length === 0}
            onClick={onPlaceOrder}
          >
            {placeOrderBusy ? 'Please wait…' : placeOrderLabel}
          </SoftButton>
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
