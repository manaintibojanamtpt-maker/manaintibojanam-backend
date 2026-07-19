import { buildDeliveryAddressLine, getLocationStoreAddress } from '@bhojan/location-core';

import type { CustomerLocation } from '@/features/location/domain/location.types';

import {
  formatDeliverySlotLabel,
  isAsapSlot,
  type CheckoutSchedulingContext,
} from './deliveryTimeSlots';

export function formatCheckoutDeliveryAddress(
  activeLocation: CustomerLocation | null,
  v2Address = getLocationStoreAddress(),
): string {
  const fromV2 = v2Address ? buildDeliveryAddressLine(v2Address.text) : '';
  return (
    fromV2.trim() ||
    activeLocation?.displayLabel?.trim() ||
    v2Address?.text?.shortLabel?.trim() ||
    'Delivery address on file'
  );
}

export function formatCheckoutEstimatedDelivery(
  deliveryTimeSlot: string,
  scheduling: CheckoutSchedulingContext | null | undefined,
): string | undefined {
  if (isAsapSlot(deliveryTimeSlot)) {
    const prepMinutes = scheduling?.prepMinutes;
    if (typeof prepMinutes === 'number' && prepMinutes > 0) {
      return `Estimated delivery in ~${prepMinutes} min`;
    }
    return 'Delivering as soon as possible';
  }

  const slotLabel = deliveryTimeSlot.replace(/^(Today|Tomorrow), /, '$1 · ');
  return slotLabel || formatDeliverySlotLabel(deliveryTimeSlot);
}

export function buildOrderTrustCopyText(input: {
  readonly orderNumber: string;
  readonly orderId: string;
  readonly deliveryAddress: string;
  readonly estimatedDelivery?: string;
}): string {
  const lines = [
    `OrderBhojan — Order #${input.orderNumber}`,
    `Order ID: ${input.orderId}`,
    `Deliver to: ${input.deliveryAddress}`,
  ];
  if (input.estimatedDelivery) {
    lines.push(`Estimated: ${input.estimatedDelivery}`);
  }
  return lines.join('\n');
}
