import { Button, GlassSurface, Text } from '@bhojan/design-system';
import type { OrderTrackingResponse } from '@/types/marketplace';

export function DeliveryTrackingPanel({
  delivery,
}: {
  readonly delivery: NonNullable<OrderTrackingResponse['delivery']>;
}) {
  return (
    <GlassSurface className="ob-tracking-px2__delivery ob-tracking-v3__panel">
      <Text variant="titleSm" as="h2" className="ob-tracking-px2__section-title">
        Delivery partner
      </Text>
      <div className="ob-tracking-px2__delivery-grid">
        {delivery.partner ? (
          <div>
            <Text variant="caption" className="ob-tracking-px2__label">Partner</Text>
            <Text variant="bodySm" style={{ fontWeight: 700 }}>{delivery.partner}</Text>
          </div>
        ) : null}
        {delivery.riderName ? (
          <div>
            <Text variant="caption" className="ob-tracking-px2__label">Rider</Text>
            <Text variant="bodySm" style={{ fontWeight: 700 }}>{delivery.riderName}</Text>
          </div>
        ) : null}
        {delivery.riderPhone ? (
          <div>
            <Text variant="caption" className="ob-tracking-px2__label">Rider phone</Text>
            <a href={`tel:${delivery.riderPhone}`} className="ob-tracking-px2__phone-link">
              {delivery.riderPhone}
            </a>
          </div>
        ) : null}
      </div>
      {delivery.trackingUrl ? (
        <Button
          variant="primary"
          className="ob-tracking-px2__track-btn"
          onClick={() => window.open(delivery.trackingUrl, '_blank', 'noopener,noreferrer')}
        >
          Track live on {delivery.partner ?? 'partner app'}
        </Button>
      ) : null}
    </GlassSurface>
  );
}
