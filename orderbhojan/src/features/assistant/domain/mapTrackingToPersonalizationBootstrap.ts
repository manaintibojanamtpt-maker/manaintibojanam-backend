import type { PersonalizationBootstrap, PersonalizationReorderSource } from './personalizationBootstrap.types';

export interface TrackingReorderSource {
  readonly orderId?: string;
  readonly orderNumber?: string;
  readonly reorder?: {
    readonly restaurantSlug: string;
    readonly restaurantId: string;
    readonly items: readonly {
      readonly itemId: string;
      readonly name: string;
      readonly quantity: number;
      readonly unitPrice: number;
    }[];
  };
}

export function mapTrackingToReorderSource(
  tracking: TrackingReorderSource,
): PersonalizationReorderSource | undefined {
  const reorder = tracking.reorder;
  if (!reorder?.items?.length) return undefined;
  if (!reorder.restaurantId?.trim() || !reorder.restaurantSlug?.trim()) return undefined;

  return {
    restaurantId: reorder.restaurantId.trim(),
    restaurantSlug: reorder.restaurantSlug.trim(),
    ...(tracking.orderId?.trim() ? { orderId: tracking.orderId.trim() } : {}),
    ...(tracking.orderNumber?.trim() ? { orderNumber: tracking.orderNumber.trim() } : {}),
    items: reorder.items.map((item) => ({
      itemId: item.itemId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };
}

export function buildPersonalizationBootstrapFromTracking(
  tracking: TrackingReorderSource | null | undefined,
): PersonalizationBootstrap | undefined {
  if (!tracking) return undefined;
  const reorder = mapTrackingToReorderSource(tracking);
  if (!reorder) return undefined;
  return { reorder };
}
