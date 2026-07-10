import type { OrderTrackingResponse } from '@/types/marketplace';
import { TrackingDeliveryPanelView } from '@bhojan/storefront-design-system/orders/tracking';
import { mapTrackingDelivery } from './mapTrackingViews';

export function OrderBhojanDeliveryTrackingPanel({
  delivery,
}: {
  readonly delivery: NonNullable<OrderTrackingResponse['delivery']>;
}) {
  return (
    <TrackingDeliveryPanelView
      delivery={mapTrackingDelivery(delivery)}
      onOpenTracking={
        delivery.trackingUrl
          ? () => window.open(delivery.trackingUrl, '_blank', 'noopener,noreferrer')
          : undefined
      }
    />
  );
}
