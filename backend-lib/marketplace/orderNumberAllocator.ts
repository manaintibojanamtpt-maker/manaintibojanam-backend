import type { Firestore, FieldValue } from 'firebase-admin/firestore';

const COUNTER_DOC = 'marketplace_order_numbers';
const STARTING_VALUE = 100_000;

export async function allocateMarketplaceOrderNumber(
  db: Firestore,
  fieldValue: typeof FieldValue,
): Promise<number> {
  const counterRef = db.collection('system_counters').doc(COUNTER_DOC);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? Number(snap.data()?.value ?? STARTING_VALUE) : STARTING_VALUE;
    const next = Number.isFinite(current) ? Math.floor(current) + 1 : STARTING_VALUE + 1;
    tx.set(
      counterRef,
      { value: next, updatedAt: fieldValue.serverTimestamp() },
      { merge: true },
    );
    return next;
  });
}

export function readOrderNumber(data: Record<string, unknown>): number | undefined {
  const raw = data.orderNumber;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
  }
  return undefined;
}

export function formatOrderNumberLabel(
  orderNumber: number | undefined,
  orderId: string,
): string {
  if (orderNumber) return String(orderNumber);
  let hash = 0;
  for (let index = 0; index < orderId.length; index += 1) {
    hash = (hash * 31 + orderId.charCodeAt(index)) >>> 0;
  }
  return String(STARTING_VALUE + (hash % 900_000));
}

export async function ensureOrderNumberOnRecord(
  db: Firestore,
  fieldValue: typeof FieldValue,
  orderId: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const existing = readOrderNumber(data);
  if (existing) return data;

  const allocated = await allocateMarketplaceOrderNumber(db, fieldValue);
  await db.collection('orders').doc(orderId).set({ orderNumber: allocated }, { merge: true });
  return { ...data, orderNumber: allocated };
}
