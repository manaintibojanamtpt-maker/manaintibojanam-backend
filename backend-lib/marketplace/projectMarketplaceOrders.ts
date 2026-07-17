import type { Firestore } from 'firebase-admin/firestore';
import type { FieldValue } from 'firebase-admin/firestore';
import {
  ensureOrderNumberOnRecord,
  formatOrderNumberLabel,
  readOrderNumber,
} from './orderNumberAllocator.js';
import { resolveOrderAddressText } from './deliveryAddressFields.js';

type OrderRecord = Record<string, unknown>;

type TrackingTimelineEntry = {
  status: string;
  at: string;
  message?: string;
};

const CANONICAL_STEPS = ['PLACED', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;

function readTimestamp(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  return new Date().toISOString();
}

function normalizeTrackingStatus(status: string): string {
  const upper = status.trim().toUpperCase();
  if (['PENDING', 'CREATED', 'PLACED', 'PENDING_PAYMENT', 'CONFIRMED'].includes(upper)) return 'PLACED';
  if (upper === 'ACCEPTED') return 'ACCEPTED';
  if (['PREPARING', 'READY'].includes(upper)) return 'PREPARING';
  if (['OUT_FOR_DELIVERY', 'DISPATCHED', 'PICKED_UP', 'COURIER_BOOKED'].includes(upper)) {
    return 'OUT_FOR_DELIVERY';
  }
  if (upper === 'DELIVERED') return 'DELIVERED';
  if (['CANCELLED', 'REJECTED', 'EXPIRED', 'FAILED_DELIVERY'].includes(upper)) return 'CANCELLED';
  return upper;
}

function buildTrackingTimeline(data: OrderRecord): TrackingTimelineEntry[] {
  const events: TrackingTimelineEntry[] = [];

  if (Array.isArray(data.statusHistory)) {
    for (const entry of data.statusHistory as Array<Record<string, unknown>>) {
      const status = normalizeTrackingStatus(String(entry.status ?? entry.newStatus ?? ''));
      if (!status || status === 'CANCELLED') continue;
      events.push({
        status,
        at: readTimestamp(entry.timestamp ?? entry.at),
        message: typeof entry.description === 'string' ? entry.description : undefined,
      });
    }
  }

  if (events.length === 0 && Array.isArray(data.timeline)) {
    for (const entry of data.timeline as Array<Record<string, unknown>>) {
      const rawStatus = String(entry.newStatus ?? entry.status ?? '');
      if (!rawStatus || rawStatus.includes('status_change') || rawStatus.includes('payment_verified')) {
        continue;
      }
      const status = normalizeTrackingStatus(rawStatus);
      events.push({
        status,
        at: readTimestamp(entry.timestamp ?? entry.at),
        message: typeof entry.description === 'string' ? entry.description : undefined,
      });
    }
  }

  if (events.length === 0) {
    events.push({
      status: normalizeTrackingStatus(String(data.status ?? 'PLACED')),
      at: readTimestamp(data.createdAt),
      message: 'Order received',
    });
  }

  const placedAt = readTimestamp(data.createdAt);
  if (!events.some((event) => event.status === 'PLACED')) {
    events.unshift({ status: 'PLACED', at: placedAt, message: 'Order received' });
  }

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const deduped: TrackingTimelineEntry[] = [];
  for (const event of events) {
    const last = deduped[deduped.length - 1];
    if (!last || last.status !== event.status) {
      deduped.push(event);
    }
  }

  const currentStatus = normalizeTrackingStatus(String(data.status ?? deduped[deduped.length - 1]?.status ?? 'PLACED'));
  const currentIndex = CANONICAL_STEPS.indexOf(currentStatus as (typeof CANONICAL_STEPS)[number]);
  if (currentIndex >= 0) {
    for (let index = 0; index <= currentIndex; index += 1) {
      const step = CANONICAL_STEPS[index];
      if (!deduped.some((event) => event.status === step)) {
        deduped.push({
          status: step,
          at: deduped[deduped.length - 1]?.at ?? placedAt,
        });
      }
    }
    deduped.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }

  return deduped;
}

function tenantDisplayName(db: Firestore, tenantId: string): Promise<string> {
  return db
    .collection('tenants')
    .doc(tenantId)
    .get()
    .then((doc) => (doc.exists ? String(doc.data()?.name ?? tenantId) : tenantId));
}

async function tenantMeta(
  db: Firestore,
  tenantId: string,
): Promise<{ displayName: string; slug: string }> {
  const doc = await db.collection('tenants').doc(tenantId).get();
  if (!doc.exists) {
    return { displayName: tenantId, slug: tenantId };
  }
  const data = doc.data() as Record<string, unknown>;
  return {
    displayName: String(data.name ?? tenantId),
    slug: String(data.slug ?? tenantId),
  };
}

function safeText(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = value as { name?: unknown; label?: unknown };
    if (typeof record.name === 'string') return record.name.trim() || undefined;
    if (typeof record.label === 'string') return record.label.trim() || undefined;
  }
  return undefined;
}

function phoneDigits(value: unknown): string | undefined {
  const text = safeText(value);
  if (!text) return undefined;
  const digits = text.replace(/\D/g, '');
  return digits || undefined;
}

function deliveryPartnerLabel(value: unknown): string | undefined {
  return safeText(value);
}

function readTrackingUrl(data: OrderRecord): string | undefined {
  return safeText(data.trackingUrl) ?? safeText(data.trackingLink);
}

function readOrderItems(data: OrderRecord) {
  if (!Array.isArray(data.items)) return [];
  return data.items
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const item = raw as Record<string, unknown>;
      const itemId = safeText(item.menuItemId ?? item.itemId ?? item.id);
      const name = safeText(item.name) ?? 'Item';
      const quantity = Number(item.quantity ?? 1);
      const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
      if (!Number.isFinite(quantity) || quantity <= 0) return null;
      return {
        itemId: itemId ?? name,
        name,
        quantity: Math.floor(quantity),
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export interface OrderTrackingMeta {
  readonly displayName: string;
  readonly slug: string;
}

export function projectOrderSummary(orderId: string, data: OrderRecord, displayName: string) {
  const orderNumber = readOrderNumber(data);
  const expiresAtRaw = data.expiresAt;
  const expiresAt =
    expiresAtRaw == null
      ? undefined
      : typeof expiresAtRaw === 'string'
        ? expiresAtRaw
        : readTimestamp(expiresAtRaw);
  return {
    orderId,
    orderNumber: formatOrderNumberLabel(orderNumber, orderId),
    restaurantId: String(data.tenantId ?? ''),
    displayName,
    status: String(data.status ?? 'PLACED'),
    paymentStatus: String(data.paymentStatus ?? 'pending'),
    grandTotal: Number(data.totalAmount ?? data.total ?? 0),
    createdAt: readTimestamp(data.createdAt),
    expiresAt,
  };
}

export function projectOrderTracking(
  orderId: string,
  data: OrderRecord,
  meta?: OrderTrackingMeta,
) {
  const timeline = buildTrackingTimeline(data);
  const status = normalizeTrackingStatus(String(data.status ?? timeline[timeline.length - 1]?.status ?? 'PLACED'));
  const items = readOrderItems(data);
  const grandTotal = Number(data.totalAmount ?? data.total ?? 0);
  const deliveryPartner = deliveryPartnerLabel(data.deliveryPartner);
  const trackingUrl = readTrackingUrl(data);
  const riderName = safeText(data.riderName);
  const riderPhone = phoneDigits(data.riderPhone);
  const reviewed = data.reviewed === true || data.feedbackStatus === 'SUBMITTED';
  const hasDeliveryDetails = Boolean(deliveryPartner || trackingUrl || riderName || riderPhone);
  const restaurantSlug = meta?.slug ?? safeText(data.tenantSlug) ?? safeText(data.tenantId);
  const restaurantName = meta?.displayName ?? safeText(data.tenantName) ?? restaurantSlug ?? 'Kitchen';
  const orderNumberValue = readOrderNumber(data);
  const orderNumber = formatOrderNumberLabel(orderNumberValue, orderId);
  const isTerminal = status === 'DELIVERED' || status === 'CANCELLED';
  const resolvedAddress = resolveOrderAddressText(data.address, data.deliveryAddress);
  const invoice =
    status === 'DELIVERED'
      ? {
          orderNumber,
          createdAt: readTimestamp(data.createdAt),
          kitchenName: restaurantName,
          customerName: safeText(data.customerName),
          phone: phoneDigits(data.phone ?? data.customerPhone),
          address: resolvedAddress,
          paymentMethod: safeText(data.paymentMethod),
          paymentStatus: safeText(data.paymentStatus),
          items,
          subtotal: Number(data.subtotal ?? grandTotal),
          gstAmount: Number(data.gstAmount ?? 0),
          gstPercent: Number(data.gst ?? 0),
          deliveryFee: Number(data.deliveryFee ?? 0),
          packingFee: Number(data.packingFee ?? data.packagingFee ?? 0),
          discountAmount: Number(data.discountAmount ?? 0),
          grandTotal,
        }
      : undefined;

  const expiresAtRaw = data.expiresAt;
  const expiresAt =
    expiresAtRaw == null
      ? undefined
      : typeof expiresAtRaw === 'string'
        ? expiresAtRaw
        : readTimestamp(expiresAtRaw);

  return {
    orderId,
    orderNumber,
    status,
    paymentStatus: String(data.paymentStatus ?? 'pending'),
    expiresAt,
    timeline,
    etaMinutes: isTerminal
      ? undefined
      : data.eta
        ? { min: Math.max(10, Number(data.eta) - 5), max: Number(data.eta) + 5 }
        : undefined,
    restaurant: {
      displayName: restaurantName,
      slug: restaurantSlug ?? 'kitchen',
      restaurantId: String(data.tenantId ?? ''),
    },
    delivery: hasDeliveryDetails
      ? {
          partner: deliveryPartner,
          trackingUrl,
          riderName,
          riderPhone,
        }
      : undefined,
    invoice,
    feedback: {
      eligible: status === 'DELIVERED',
      submitted: reviewed,
      rating: typeof data.rating === 'number' ? data.rating : undefined,
      comment: safeText(data.feedback),
    },
    reorder:
      items.length > 0 && restaurantSlug
        ? {
            restaurantSlug,
            restaurantId: String(data.tenantId ?? ''),
            items,
          }
        : undefined,
  };
}

export async function listMarketplaceOrdersForUser(db: Firestore, userId: string, limit = 20) {
  const snapshot = await db
    .collection('orders')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  const tenantNames = new Map<string, string>();
  const orders = [];
  for (const doc of snapshot.docs) {
    const data = doc.data() as OrderRecord;
    const tenantId = String(data.tenantId ?? '');
    if (!tenantNames.has(tenantId)) {
      tenantNames.set(tenantId, await tenantDisplayName(db, tenantId));
    }
    orders.push(projectOrderSummary(doc.id, data, tenantNames.get(tenantId)!));
  }
  return orders;
}

export async function getMarketplaceOrderForUser(
  db: Firestore,
  orderId: string,
  userId: string,
  fieldValue?: typeof FieldValue,
) {
  const doc = await db.collection('orders').doc(orderId).get();
  if (!doc.exists) return null;
  let data = doc.data() as OrderRecord;
  if (String(data.userId ?? '') !== userId) return null;
  if (fieldValue) {
    data = (await ensureOrderNumberOnRecord(db, fieldValue, orderId, data)) as OrderRecord;
  }
  const displayName = await tenantDisplayName(db, String(data.tenantId ?? ''));
  const meta = await tenantMeta(db, String(data.tenantId ?? ''));
  return {
    summary: projectOrderSummary(doc.id, data, displayName),
    tracking: projectOrderTracking(doc.id, data, meta),
  };
}

export async function getMarketplaceTrackingForGuest(
  db: Firestore,
  orderId: string,
  phone: string,
  fieldValue?: typeof FieldValue,
) {
  const doc = await db.collection('orders').doc(orderId).get();
  if (!doc.exists) return null;
  let data = doc.data() as OrderRecord;
  const orderPhone = String(data.phone ?? data.customerPhone ?? '').replace(/\D/g, '');
  const inputPhone = phone.replace(/\D/g, '');
  if (!orderPhone || !inputPhone) return null;
  if (orderPhone.slice(-4) !== inputPhone.slice(-4)) return null;
  if (fieldValue) {
    data = (await ensureOrderNumberOnRecord(db, fieldValue, orderId, data)) as OrderRecord;
  }
  const meta = await tenantMeta(db, String(data.tenantId ?? ''));
  return projectOrderTracking(doc.id, data, meta);
}
