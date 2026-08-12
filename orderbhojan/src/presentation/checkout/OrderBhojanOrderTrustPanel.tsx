import { useState } from 'react';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { buildOrderTrustCopyText } from '@/features/checkout/domain/checkoutDeliveryDisplay';
import { PRICING_TRUST } from '@/features/experience/domain/pricingTrustCopy';

export type OrderTrustPanelVariant = 'success' | 'confirming' | 'pending_payment' | 'loading' | 'error';

export interface OrderBhojanOrderTrustPanelProps {
  readonly orderNumber?: string;
  readonly orderId?: string;
  readonly deliveryAddress: string;
  readonly estimatedDelivery?: string;
  readonly variant?: OrderTrustPanelVariant;
  readonly paymentNote?: string;
  readonly showCopyActions?: boolean;
  readonly customerDeliveryFee?: number;
  readonly freeDeliveryApplied?: boolean;
  readonly trackingUrl?: string | null;
  readonly deliveryStatus?: string;
  readonly isServiceable?: boolean;
  readonly errorMessage?: string;
}

function SuccessIcon({ confirming }: { readonly confirming: boolean }) {
  if (confirming) {
    return (
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full border border-[#f4a261]/30 bg-[#f4a261]/10"
        aria-hidden
      >
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#f4a261]/25 border-t-[#f4a261]" />
      </div>
    );
  }

  return (
    <div
      className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 text-emerald-300" fill="none">
        <path
          d="M6 12.5 10 16.5 18 8.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function OrderBhojanOrderTrustPanel({
  orderNumber,
  orderId,
  deliveryAddress,
  estimatedDelivery,
  variant = 'success',
  paymentNote,
  showCopyActions = true,
  customerDeliveryFee,
  freeDeliveryApplied,
  trackingUrl,
  deliveryStatus,
  isServiceable = true,
  errorMessage,
}: OrderBhojanOrderTrustPanelProps) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const confirming = variant === 'confirming';
  const pendingPayment = variant === 'pending_payment';
  const isLoading = variant === 'loading';
  const isError = variant === 'error';

  const headline = isLoading
    ? 'Checking delivery availability…'
    : isError
      ? 'Delivery Check Failed'
      : confirming
        ? 'Placing your order…'
        : pendingPayment
          ? 'Order reserved — complete payment'
          : 'Order placed successfully';

  const handleCopy = async () => {
    if (!orderNumber || !orderId) return;
    const text = buildOrderTrustCopyText({
      orderNumber,
      orderId,
      deliveryAddress,
      estimatedDelivery,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage('Order details copied');
    } catch {
      setCopyMessage('Copy failed — long-press the order number to copy manually');
    }
  };

  const handleShare = async () => {
    if (!orderNumber || !orderId) return;
    const text = buildOrderTrustCopyText({
      orderNumber,
      orderId,
      deliveryAddress,
      estimatedDelivery,
    });
    try {
      if (navigator.share) {
        await navigator.share({
          title: `OrderBhojan order #${orderNumber}`,
          text,
        });
        setCopyMessage('Order details shared');
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopyMessage('Order details copied');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setCopyMessage('Unable to share order details right now');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4" data-testid="trust-panel-loading">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#f4a261]/30 border-t-[#f4a261]" />
          <p className="text-sm font-medium text-white/80">{headline}</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4" data-testid="trust-panel-error">
        <p className="text-sm font-semibold text-red-300">{headline}</p>
        <p className="text-xs text-red-200/80">
          {errorMessage || "We couldn't confirm delivery availability yet. Please try again."}
        </p>
      </div>
    );
  }

  const isFreeDelivery = freeDeliveryApplied || customerDeliveryFee === 0;

  return (
    <div className="space-y-4" data-testid="trust-panel">
      <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <SuccessIcon confirming={confirming} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-base font-semibold text-white">{headline}</p>
          {orderNumber ? (
            <p className="text-sm text-[#FFB347]">
              Order #{orderNumber}
              {confirming ? ' · confirming…' : null}
            </p>
          ) : null}
          {paymentNote ? <p className="text-xs text-white/60">{paymentNote}</p> : null}
        </div>
      </div>

      {!isServiceable ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4" data-testid="unserviceable-warning">
          <p className="text-xs font-semibold text-amber-300">Delivery Unavailable</p>
          <p className="mt-0.5 text-xs text-amber-200/80">
            Delivery is currently unavailable for this location.
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Deliver to</p>
          <p className="mt-1 text-sm leading-relaxed text-white/85">{deliveryAddress}</p>
        </div>

        {estimatedDelivery ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
              Estimated Delivery
            </p>
            <p className="mt-1 text-sm font-medium text-white/90">{estimatedDelivery}</p>
          </div>
        ) : null}

        {customerDeliveryFee !== undefined ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Delivery Fee</p>
            <p className="mt-1 text-sm font-semibold text-[#FFB347]">
              {isFreeDelivery ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs font-bold text-emerald-300">
                    FREE
                  </span>
                  Free Delivery Applied
                </span>
              ) : (
                `₹${customerDeliveryFee}`
              )}
            </p>
          </div>
        ) : null}

        {deliveryStatus ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Status</p>
            <p className="mt-1 text-xs font-medium text-white/80">{deliveryStatus}</p>
          </div>
        ) : null}

        {orderId && !confirming ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Order ID</p>
            <p className="mt-1 break-all font-mono text-xs text-white/55">{orderId}</p>
          </div>
        ) : null}

        {!confirming ? (
          <p className="text-xs leading-relaxed text-emerald-100/80" data-testid="order-pricing-trust">
            {PRICING_TRUST.successNote}
          </p>
        ) : null}

        {trackingUrl ? (
          <div className="pt-2">
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30"
              data-testid="track-delivery-link"
            >
              Track Live Delivery →
            </a>
          </div>
        ) : null}
      </div>

      {showCopyActions && !confirming && orderNumber && orderId ? (
        <div className="flex flex-wrap gap-2">
          <SoftButton type="button" tone="secondary" onClick={() => void handleCopy()}>
            Copy order details
          </SoftButton>
          {typeof navigator !== 'undefined' && 'share' in navigator ? (
            <SoftButton type="button" tone="ghost" onClick={() => void handleShare()}>
              Share order
            </SoftButton>
          ) : null}
        </div>
      ) : null}

      {copyMessage ? (
        <p className="text-xs text-emerald-200/90" aria-live="polite">
          {copyMessage}
        </p>
      ) : null}
    </div>
  );
}
