import { useState } from 'react';

import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';

import { buildOrderTrustCopyText } from '@/features/checkout/domain/checkoutDeliveryDisplay';
import { PRICING_TRUST } from '@/features/experience/domain/pricingTrustCopy';

export type OrderTrustPanelVariant = 'success' | 'confirming' | 'pending_payment';

export interface OrderBhojanOrderTrustPanelProps {
  readonly orderNumber: string;
  readonly orderId: string;
  readonly deliveryAddress: string;
  readonly estimatedDelivery?: string;
  readonly variant?: OrderTrustPanelVariant;
  readonly paymentNote?: string;
  readonly showCopyActions?: boolean;
}

function SuccessIcon({ confirming }: { readonly confirming: boolean }) {
  if (confirming) {
    return (
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full border border-[#FF7A00]/30 bg-[#FF7A00]/10"
        aria-hidden
      >
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF7A00]/25 border-t-[#FF7A00]" />
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
}: OrderBhojanOrderTrustPanelProps) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const confirming = variant === 'confirming';
  const pendingPayment = variant === 'pending_payment';

  const headline = confirming
    ? 'Placing your order…'
    : pendingPayment
      ? 'Order reserved — complete payment'
      : 'Order placed successfully';

  const handleCopy = async () => {
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

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <SuccessIcon confirming={confirming} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-base font-semibold text-white">{headline}</p>
          <p className="text-sm text-[#FFB347]">
            Order #{orderNumber}
            {confirming ? ' · confirming…' : null}
          </p>
          {paymentNote ? <p className="text-xs text-white/60">{paymentNote}</p> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Deliver to</p>
          <p className="mt-1 text-sm leading-relaxed text-white/85">{deliveryAddress}</p>
        </div>

        {estimatedDelivery ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
              Estimated delivery
            </p>
            <p className="mt-1 text-sm text-white/75">{estimatedDelivery}</p>
          </div>
        ) : null}

        {!confirming ? (
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
      </div>

      {showCopyActions && !confirming ? (
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
