import type { OrderTrackingResponse } from '@/types/marketplace';
import { CourierTrackingTimelineView } from '@bhojan/storefront-design-system/orders/tracking';
import { mapTrackingTimelineSteps } from './mapTrackingViews';

export interface OrderBhojanOrderTimelineProps {
  readonly tracking: OrderTrackingResponse;
}

export function OrderBhojanOrderTimeline({ tracking }: OrderBhojanOrderTimelineProps) {
  const { steps, cancelled } = mapTrackingTimelineSteps(tracking);
  return <CourierTrackingTimelineView steps={steps} cancelled={cancelled} />;
}
