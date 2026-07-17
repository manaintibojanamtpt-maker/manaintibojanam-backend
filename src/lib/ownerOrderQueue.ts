/**
 * Owner order queue — active vs scheduled split (matches AdminPanel 60-min prep window).
 */

import { coerceOwnerOrderDate, type OwnerOrderSnapshot } from './ownerOrderReadModelMapper';

export const OWNER_SCHEDULED_PREP_WINDOW_MS = 60 * 60 * 1000;

export type OwnerQueueOrder = Pick<
  OwnerOrderSnapshot,
  | 'id'
  | 'orderNumber'
  | 'deliveryType'
  | 'scheduledFor'
  | 'scheduledTime'
  | 'deliveryTimeSlot'
  | 'createdAt'
  | 'status'
>;

export interface OwnerOrderQueueSplit {
  activeOrders: OwnerOrderSnapshot[];
  scheduledOrders: OwnerOrderSnapshot[];
}

export function resolveOwnerScheduledTime(
  order: Pick<OwnerQueueOrder, 'scheduledFor' | 'scheduledTime'>,
): Date | null {
  return (
    coerceOwnerOrderDate(order.scheduledFor) ??
    coerceOwnerOrderDate(order.scheduledTime)
  );
}

export function resolveOwnerDeliveryType(
  order: Pick<OwnerQueueOrder, 'deliveryType' | 'scheduledFor' | 'scheduledTime'>,
): 'asap' | 'scheduled' {
  const deliveryType = String(order.deliveryType ?? '').toLowerCase();
  if (deliveryType === 'scheduled') return 'scheduled';
  if (resolveOwnerScheduledTime(order)) return 'scheduled';
  return 'asap';
}

function simplifyTimeRange(timeRange: string): string {
  const parts = timeRange.split(' - ').map((part) => part.trim());
  if (parts.length !== 2) return timeRange;

  const startMatch = parts[0].match(/^(\d{1,2})(?::\d{2})?\s*(AM|PM)$/i);
  const endMatch = parts[1].match(/^(\d{1,2})(?::\d{2})?\s*(AM|PM)$/i);
  if (!startMatch || !endMatch) return timeRange;

  const startMeridiem = startMatch[2].toUpperCase();
  const endMeridiem = endMatch[2].toUpperCase();
  if (startMeridiem === endMeridiem) {
    return `${startMatch[1]}-${endMatch[1]} ${startMeridiem}`;
  }
  return `${parts[0]} - ${parts[1]}`;
}

export function formatOwnerScheduleSlotLabel(order: OwnerQueueOrder): string {
  const slot = String(order.deliveryTimeSlot ?? '').trim();
  if (slot && slot !== 'ASAP' && !slot.includes('ASAP')) {
    const dayMatch = slot.match(/^(Today|Tomorrow),\s*(.+)$/i);
    if (dayMatch) {
      return `${dayMatch[1]} ${simplifyTimeRange(dayMatch[2])}`;
    }
    return slot.replace(/^(Today|Tomorrow),\s*/i, '');
  }

  const scheduled = resolveOwnerScheduledTime(order);
  if (!scheduled) return 'Scheduled';

  const dayLabel = scheduled.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
  const timeLabel = scheduled.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dayLabel} ${timeLabel}`;
}

export function getOwnerScheduledPrepStart(
  order: Pick<OwnerQueueOrder, 'scheduledFor' | 'scheduledTime'>,
): Date | null {
  const scheduledTime = resolveOwnerScheduledTime(order);
  if (!scheduledTime) return null;
  return new Date(scheduledTime.getTime() - OWNER_SCHEDULED_PREP_WINDOW_MS);
}

export function isOwnerScheduledInActiveWindow(
  order: OwnerQueueOrder,
  now: Date = new Date(),
): boolean {
  if (resolveOwnerDeliveryType(order) !== 'scheduled') return false;
  const prepStart = getOwnerScheduledPrepStart(order);
  return prepStart != null && now >= prepStart;
}

export function sortOwnerOrdersForQueue(
  orders: readonly OwnerOrderSnapshot[],
): OwnerOrderSnapshot[] {
  return [...orders].sort((a, b) => {
    const aDelivery = resolveOwnerDeliveryType(a);
    const bDelivery = resolveOwnerDeliveryType(b);

    if (aDelivery === 'asap' && bDelivery !== 'asap') return -1;
    if (aDelivery !== 'asap' && bDelivery === 'asap') return 1;

    if (aDelivery === 'scheduled' && bDelivery === 'scheduled') {
      const aScheduled = resolveOwnerScheduledTime(a)?.getTime() ?? 0;
      const bScheduled = resolveOwnerScheduledTime(b)?.getTime() ?? 0;
      if (aScheduled !== bScheduled) return aScheduled - bScheduled;
    }

    const aCreated = coerceOwnerOrderDate(a.createdAt)?.getTime() ?? 0;
    const bCreated = coerceOwnerOrderDate(b.createdAt)?.getTime() ?? 0;
    return bCreated - aCreated;
  });
}

export function splitOwnerOrdersBySchedule(
  orders: readonly OwnerOrderSnapshot[],
  now: Date = new Date(),
): OwnerOrderQueueSplit {
  const sortedOrders = sortOwnerOrdersForQueue(orders);
  const active: OwnerOrderSnapshot[] = [];
  const scheduled: OwnerOrderSnapshot[] = [];

  for (const order of sortedOrders) {
    const deliveryType = resolveOwnerDeliveryType(order);
    if (deliveryType === 'asap') {
      active.push(order);
      continue;
    }

    const prepStart = getOwnerScheduledPrepStart(order);
    if (prepStart && now >= prepStart) {
      active.push(order);
    } else {
      scheduled.push(order);
    }
  }

  return { activeOrders: active, scheduledOrders: scheduled };
}
