import type { Firestore } from 'firebase-admin/firestore';

type OrderRecord = Record<string, unknown>;

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
  const timeline = Array.isArray(data.timeline)
    ? (data.timeline as Array<Record<string, unknown>>).map((entry) => ({
        status: String(entry.eventType ?? entry.status ?? 'update'),
        at: readTimestamp(entry.timestamp ?? entry.at),
        message: typeof entry.description === 'string' ? entry.description : undefined,
      }))
    : [
        {
          status: String(data.status ?? 'PLACED'),
          at: readTimestamp(data.createdAt),
          message: 'Order received',
        },
      ];

  return {
    orderId,
    status: String(data.status ?? 'PLACED'),
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
