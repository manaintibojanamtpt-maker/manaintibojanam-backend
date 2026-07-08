import type { Firestore } from 'firebase-admin/firestore';

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

export function projectOrderSummary(orderId: string, data: OrderRecord, displayName: string) {
  return {
    orderId,
    restaurantId: String(data.tenantId ?? ''),
    displayName,
    status: String(data.status ?? 'PLACED'),
    grandTotal: Number(data.totalAmount ?? data.total ?? 0),
    createdAt: readTimestamp(data.createdAt),
  };
}

export function projectOrderTracking(orderId: string, data: OrderRecord) {
  const timeline = buildTrackingTimeline(data);
  const status = normalizeTrackingStatus(String(data.status ?? timeline[timeline.length - 1]?.status ?? 'PLACED'));

  return {
    orderId,
    status,
    timeline,
    etaMinutes: data.eta
      ? { min: Math.max(10, Number(data.eta) - 5), max: Number(data.eta) + 5 }
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
) {
  const doc = await db.collection('orders').doc(orderId).get();
  if (!doc.exists) return null;
  const data = doc.data() as OrderRecord;
  if (String(data.userId ?? '') !== userId) return null;
  const displayName = await tenantDisplayName(db, String(data.tenantId ?? ''));
  return {
    summary: projectOrderSummary(doc.id, data, displayName),
    tracking: projectOrderTracking(doc.id, data),
  };
}

export async function getMarketplaceTrackingForGuest(
  db: Firestore,
  orderId: string,
  phone: string,
) {
  const doc = await db.collection('orders').doc(orderId).get();
  if (!doc.exists) return null;
  const data = doc.data() as OrderRecord;
  const orderPhone = String(data.phone ?? data.customerPhone ?? '').replace(/\D/g, '');
  const inputPhone = phone.replace(/\D/g, '');
  if (!orderPhone || !inputPhone) return null;
  if (orderPhone.slice(-4) !== inputPhone.slice(-4)) return null;
  return projectOrderTracking(doc.id, data);
}
