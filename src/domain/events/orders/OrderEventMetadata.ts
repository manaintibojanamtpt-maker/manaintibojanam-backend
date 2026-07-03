/** Order event metadata types (M6 PR-5). Pure domain — no SDK imports. */

export interface OrderEventPublishContext {
  readonly correlationId: string;
  readonly causationId?: string;
  readonly traceId?: string;
  readonly idempotencyKey?: string;
  readonly producer?: string;
}

/** Minimal legacy order shape for event mapping — no Firestore types. */
export interface LegacyOrderDocument {
  readonly id: string;
  readonly tenantId: string;
  readonly userId?: string | null;
  readonly status: string;
  readonly orderNumber?: number;
  readonly customerName?: string | null;
  readonly phone?: string;
  readonly paymentMethod?: string;
  readonly paymentStatus?: string;
  readonly subtotal?: number;
  readonly totalAmount?: number;
  readonly items?: readonly LegacyOrderLineItem[];
  readonly createdAt?: LegacyTimestamp;
  readonly updatedAt?: LegacyTimestamp;
  readonly cancellationReason?: string;
}

export interface LegacyOrderLineItem {
  readonly menuItemId?: string;
  readonly name?: string;
  readonly quantity?: number;
  readonly unitPrice?: number;
  readonly lineTotal?: number;
}

export type LegacyTimestamp =
  | string
  | number
  | { readonly toDate?: () => Date };

export interface OrderEventMetadataFields {
  readonly tenantId: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly traceId?: string;
  readonly idempotencyKey?: string;
  readonly source: string;
}

export function buildOrderEventMetadataFields(
  order: LegacyOrderDocument,
  context: OrderEventPublishContext
): OrderEventMetadataFields {
  return {
    tenantId: order.tenantId,
    correlationId: context.correlationId,
    causationId: context.causationId,
    traceId: context.traceId,
    idempotencyKey: context.idempotencyKey,
    source: context.producer ?? 'M1-OrderPlatform',
  };
}
