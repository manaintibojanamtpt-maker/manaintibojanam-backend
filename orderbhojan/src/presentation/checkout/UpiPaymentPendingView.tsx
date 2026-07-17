import { useState } from 'react';
import { TransactionalPageShell } from '@bhojan/storefront-design-system/cart/TransactionalPageShell';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import {
  buildUpiCopyText,
  buildUpiQrImageUrl,
  isIosDevice,
  isMobileDevice,
  launchUpiApp,
  UPI_APP_CHOICES,
  type UpiAppId,
} from '@/features/checkout/infrastructure/upiCheckout';

export interface UpiPaymentPendingViewProps {
  readonly orderNumber: string;
  readonly amount: number;
  readonly upiUrl: string;
  readonly expiresAt?: string;
  readonly verifying: boolean;
  readonly pollMessage?: string | null;
  readonly errorMessage?: string | null;
  readonly onCheckPayment: () => void;
  readonly onTrack: () => void;
  readonly onBrowse: () => void;
}

function formatAmount(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

function formatExpiry(expiresAt?: string): string | undefined {
  if (!expiresAt) return undefined;
  const expiresMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMs)) return undefined;
  return new Date(expiresMs).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function UpiPaymentPendingView({
  orderNumber,
  amount,
  upiUrl,
  expiresAt,
  verifying,
  pollMessage,
  errorMessage,
  onCheckPayment,
  onTrack,
  onBrowse,
}: UpiPaymentPendingViewProps) {
  const mobile = isMobileDevice();
  const ios = isIosDevice();
  const expiryLabel = formatExpiry(expiresAt);
  const [qrFailed, setQrFailed] = useState(false);
  const [showQr, setShowQr] = useState(!mobile);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);

  const handleOpenApp = (appId: UpiAppId) => {
    if (ios && appId === 'other') {
      setShowQr(true);
      setLaunchMessage('On iPhone, scan the QR below or copy payment details into your UPI app.');
      return;
    }

    const launched = launchUpiApp(appId, upiUrl);
    if (!launched) {
      setLaunchMessage('Unable to open that UPI app. Try another option or copy payment details.');
      return;
    }

    setLaunchMessage(null);
  };

  const handleCopyDetails = async () => {
    const text = buildUpiCopyText({ upiUrl, amount, orderNumber });
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage('Payment details copied. Paste them in your UPI app if needed.');
    } catch {
      setCopyMessage('Copy failed. Long-press the UPI ID in the QR section to copy manually.');
    }
  };

  return (
    <TransactionalPageShell
      title="Complete UPI payment"
      subtitle={`Order #${orderNumber} · ${formatAmount(amount)} · payment pending`}
    >
      <div className="space-y-4">
        <p className="text-sm text-white/75">
          Your order is reserved but not confirmed yet. Complete payment in your UPI app. We will
          confirm only after payment is verified.
        </p>

        {expiryLabel ? (
          <p className="text-xs text-amber-200/90">Complete payment by {expiryLabel} or the order will expire.</p>
        ) : null}

        {mobile ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-white/85">Choose your UPI app</p>
            <p className="mt-1 text-xs text-white/55">
              Pick the app you pay with. We open it directly so WhatsApp and other apps are not
              triggered.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {UPI_APP_CHOICES.map((app) => (
                <SoftButton
                  key={app.id}
                  type="button"
                  tone="secondary"
                  fullWidth
                  onClick={() => handleOpenApp(app.id)}
                >
                  {app.shortLabel}
                </SoftButton>
              ))}
            </div>
            {launchMessage ? (
              <p className="mt-3 text-xs text-amber-200/90" aria-live="polite">
                {launchMessage}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <SoftButton type="button" tone="ghost" onClick={() => void handleCopyDetails()}>
                Copy payment details
              </SoftButton>
              <SoftButton type="button" tone="ghost" onClick={() => setShowQr((value) => !value)}>
                {showQr ? 'Hide QR code' : 'Show QR code'}
              </SoftButton>
            </div>
            {copyMessage ? (
              <p className="mt-2 text-xs text-emerald-200/90" aria-live="polite">
                {copyMessage}
              </p>
            ) : null}
          </div>
        ) : null}

        {!mobile || showQr ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="mb-3 text-sm text-white/70">
              {mobile
                ? 'Scan this QR with your UPI app, or copy the payment details above.'
                : 'Scan this QR with GPay, PhonePe, or Paytm on your phone'}
            </p>
            {!qrFailed ? (
              <img
                src={buildUpiQrImageUrl(upiUrl)}
                alt={`UPI QR code for order ${orderNumber}`}
                className="mx-auto h-[220px] w-[220px] rounded-xl bg-white p-2"
                onError={() => setQrFailed(true)}
              />
            ) : (
              <p className="text-sm text-white/60">
                QR preview unavailable. Use copy payment details on your phone.
              </p>
            )}
            <p className="mt-3 break-all text-xs text-white/45">{upiUrl}</p>
          </div>
        ) : null}

        {pollMessage ? (
          <p className="text-sm text-white/60" aria-live="polite">
            {pollMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p role="alert" className="text-sm text-red-300">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <SoftButton type="button" disabled={verifying} onClick={onCheckPayment}>
            {verifying ? 'Checking payment…' : 'I have paid — check status'}
          </SoftButton>
          <SoftButton type="button" tone="secondary" onClick={onTrack}>
            View order status
          </SoftButton>
          <SoftButton type="button" tone="ghost" onClick={onBrowse}>
            Continue browsing
          </SoftButton>
        </div>
      </div>
    </TransactionalPageShell>
  );
}
