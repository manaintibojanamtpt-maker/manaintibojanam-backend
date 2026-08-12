import { buildDeliveryAddressLine, getLocationStoreAddress } from '@bhojan/location-core';

import type { CustomerLocation } from '@/features/location/domain/location.types';

import {
  formatDeliverySlotLabel,
  isAsapSlot,
  type CheckoutSchedulingContext,
} from './deliveryTimeSlots';

export type BillDeliveryScheduleLine = {
  readonly label: string;
  readonly amountLabel: string;
};

/** Minimal notice shape — avoids domain → store coupling. */
export type BillScheduleVoiceNotice = {
  readonly kind: 'applied' | 'clarify' | 'error';
};

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

/**
 * Bill breakdown row for delivery timing (metadata only).
 * Clarify/error voice notices win until the shopper picks a slot (notice cleared).
 */
export function formatBillDeliveryScheduleLine(input: {
  readonly deliveryTimeSlot?: string | null;
  readonly voiceScheduleNotice?: BillScheduleVoiceNotice | null;
}): BillDeliveryScheduleLine | null {
  const notice = input.voiceScheduleNotice;
  if (notice?.kind === 'clarify') {
    return {
      label: 'Delivery Slot',
      amountLabel: 'Schedule unclear — please select a time',
    };
  }
  if (notice?.kind === 'error') {
    return {
      label: 'Delivery Slot',
      amountLabel: 'Schedule unavailable — please select a time',
    };
  }

  const slot = (input.deliveryTimeSlot ?? '').trim();
  if (!slot || isAsapSlot(slot)) {
    return null;
  }

  const slotLabel = formatDeliverySlotLabel(slot);
  return {
    label: 'Delivery Slot',
    amountLabel: `Scheduled for ${slotLabel}`,
  };
}

/**
 * Success / UPI trust panel delivery line (metadata only).
 * Same priority as bill; post-place clarify/error asks shopper to contact support.
 */
export function formatTrustPanelDeliverySchedule(input: {
  readonly deliveryTimeSlot?: string | null;
  readonly voiceScheduleNotice?: BillScheduleVoiceNotice | null;
}): string | undefined {
  const notice = input.voiceScheduleNotice;
  if (notice?.kind === 'clarify') {
    return 'Schedule unclear — please contact support';
  }
  if (notice?.kind === 'error') {
    return 'Schedule unavailable — please contact support';
  }

  const slot = (input.deliveryTimeSlot ?? '').trim();
  if (!slot) return undefined;

  if (isAsapSlot(slot)) {
    return 'Deliver now';
  }

  return `Scheduled for ${formatDeliverySlotLabel(slot)}`;
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
