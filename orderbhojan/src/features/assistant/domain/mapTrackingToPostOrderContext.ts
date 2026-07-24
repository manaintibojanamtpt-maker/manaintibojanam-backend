import type { PostOrderContext, PostOrderSnapshot } from './postOrderAssistContract';
import { buildPostOrderContext } from './postOrderAssistContract';

/** Minimal tracking shape — avoids pulling marketplace fetchers into the assistant module. */
export interface TrackingSnapshotSource {
  readonly orderId?: string;
  readonly orderNumber?: string;
  readonly status?: string;
  readonly paymentStatus?: string;
  readonly etaMinutes?: { readonly min: number; readonly max: number };
  readonly timeline?: readonly { readonly message?: string }[];
}

export function mapTrackingToPostOrderSnapshot(
  tracking: TrackingSnapshotSource,
): PostOrderSnapshot {
  const last = tracking.timeline?.length
    ? tracking.timeline[tracking.timeline.length - 1]
    : undefined;

  return {
    ...(tracking.orderNumber?.trim() ? { orderNumber: tracking.orderNumber.trim() } : {}),
    ...(tracking.status?.trim() ? { status: tracking.status.trim() } : {}),
    ...(tracking.paymentStatus?.trim() ? { paymentStatus: tracking.paymentStatus.trim() } : {}),
    ...(tracking.etaMinutes ? { etaMinutes: tracking.etaMinutes } : {}),
    ...(last?.message?.trim() ? { lastTimelineMessage: last.message.trim() } : {}),
  };
}

/**
 * Map caller-owned tracking DTO into post-order assist context (no network).
 * Reorder / cancel / refund payloads are intentionally omitted.
 */
export function buildPostOrderContextFromTracking(params: {
  readonly orderId?: string;
  readonly guestPhone?: string;
  readonly tracking?: TrackingSnapshotSource | null;
}): PostOrderContext | undefined {
  const snapshot = params.tracking ? mapTrackingToPostOrderSnapshot(params.tracking) : undefined;
  return buildPostOrderContext({
    orderId: params.orderId ?? params.tracking?.orderId,
    guestPhone: params.guestPhone,
    snapshot,
  });
}
