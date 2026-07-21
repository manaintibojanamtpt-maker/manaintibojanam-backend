import { useState } from 'react';

import { TransactionalPageShell } from '@bhojan/storefront-design-system/cart/TransactionalPageShell';

import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';

import { OrderBhojanOrderTrustPanel } from '@/presentation/checkout/OrderBhojanOrderTrustPanel';

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

  readonly orderId: string;

  readonly orderNumber: string;

  readonly deliveryAddress: string;

  readonly estimatedDelivery?: string;

  readonly phone: string;

  readonly amount: number;

  readonly upiUrl: string;

  readonly expiresAt?: string;

  readonly verifying: boolean;

  readonly pollMessage?: string | null;

  readonly errorMessage?: string | null;

  readonly onCheckPayment: () => void;

  readonly onNotifyKitchen?: (upiReference?: string) => Promise<void>;

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

  orderId,

  orderNumber,

  deliveryAddress,

  estimatedDelivery,

  phone: _phone,

  amount,

  upiUrl,

  expiresAt,

  verifying,

  pollMessage,

  errorMessage,

  onCheckPayment,

  onNotifyKitchen,

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

  const [upiReference, setUpiReference] = useState('');

  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);

  const [notifySubmitting, setNotifySubmitting] = useState(false);



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



  const handleNotifyKitchen = async () => {

    if (!onNotifyKitchen) return;

    setNotifySubmitting(true);

    setNotifyMessage(null);

    try {

      await onNotifyKitchen(upiReference.trim() || undefined);

      setNotifyMessage(

        upiReference.trim()

          ? 'Thanks — we notified the kitchen with your UPI reference.'

          : 'Thanks — we notified the kitchen that you paid. They will verify and confirm shortly.',

      );

    } catch (err) {

      setNotifyMessage(err instanceof Error ? err.message : 'Unable to notify kitchen right now.');

    } finally {

      setNotifySubmitting(false);

    }

  };



  return (

    <TransactionalPageShell

      title="Complete UPI payment"

      subtitle={`${formatAmount(amount)} · payment pending`}

      embedded

    >

      <div className="space-y-4">

        <OrderBhojanOrderTrustPanel
          orderNumber={orderNumber}
          orderId={orderId}
          deliveryAddress={deliveryAddress}
          estimatedDelivery={estimatedDelivery}
          variant="pending_payment"
          paymentNote="Complete UPI payment to confirm this order."
        />

        <p className="text-sm text-white/75">

          Pay in your UPI app, then wait here — we confirm only after the kitchen verifies payment

          in their UPI statement.

        </p>

        <p className="text-xs text-white/55">

          Direct UPI (without Razorpay) cannot auto-detect bank confirmation. This usually takes a

          minute after the kitchen taps verify.

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



        {onNotifyKitchen ? (

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">

            <p className="text-sm font-medium text-white/85">Already paid?</p>

            <label className="block text-xs text-white/55" htmlFor={`upi-ref-${orderId}`}>

              UPI transaction ID (optional, helps the kitchen verify faster)

            </label>

            <input

              id={`upi-ref-${orderId}`}

              value={upiReference}

              onChange={(event) => setUpiReference(event.target.value)}

              placeholder="e.g. 123456789012"

              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/35"

            />

            <SoftButton

              type="button"

              tone="secondary"

              disabled={notifySubmitting}

              onClick={() => void handleNotifyKitchen()}

            >

              {notifySubmitting ? 'Sending…' : "I've paid — notify kitchen"}

            </SoftButton>

            {notifyMessage ? (

              <p className="text-xs text-emerald-200/90" aria-live="polite">

                {notifyMessage}

              </p>

            ) : null}

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


