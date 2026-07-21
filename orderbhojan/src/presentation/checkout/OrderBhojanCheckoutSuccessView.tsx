import { TransactionalPageShell } from '@bhojan/storefront-design-system/cart/TransactionalPageShell';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';

import { OrderBhojanOrderTrustPanel } from '@/presentation/checkout/OrderBhojanOrderTrustPanel';

export interface OrderBhojanCheckoutSuccessViewProps {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly deliveryAddress: string;
  readonly estimatedDelivery?: string;
  readonly confirming?: boolean;
  readonly paymentNote?: string;
  readonly onTrack: () => void;
  readonly onBrowse: () => void;
}

export function OrderBhojanCheckoutSuccessView({
  orderId,
  orderNumber,
  deliveryAddress,
  estimatedDelivery,
  confirming = false,
  paymentNote,
  onTrack,
  onBrowse,
}: OrderBhojanCheckoutSuccessViewProps) {
  const subtitle = confirming
    ? 'Confirming cash on delivery — this usually takes a moment.'
    : 'Save your order number for updates and support.';

  return (
    <TransactionalPageShell
      title={confirming ? 'Placing your order' : 'Order confirmed'}
      subtitle={subtitle}
      embedded
    >
      <OrderBhojanOrderTrustPanel
        orderNumber={orderNumber}
        orderId={orderId}
        deliveryAddress={deliveryAddress}
        estimatedDelivery={estimatedDelivery}
        variant={confirming ? 'confirming' : 'success'}
        paymentNote={paymentNote}
        showCopyActions={!confirming}
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <SoftButton type="button" disabled={confirming} onClick={onTrack}>
          Track order
        </SoftButton>
        <SoftButton type="button" tone="secondary" onClick={onBrowse}>
          Continue browsing
        </SoftButton>
      </div>
    </TransactionalPageShell>
  );
}
