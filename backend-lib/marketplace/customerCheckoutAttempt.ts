import { createHash } from 'node:crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';

export function checkoutAttemptRef(db: Firestore, uid: string, id: string) {
  if (!uid || !/^[a-zA-Z0-9_-]{16,128}$/.test(id)) throw Object.assign(new Error('Authenticated checkout attempt required'), { statusCode: 400 });
  return db.collection('customer_checkout_attempts').doc(createHash('sha256').update(uid + ':' + id).digest('hex'));
}
export function checkoutRequestHash(value: unknown): string {
  const canonical = (v: any): any => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => [k, canonical(v[k])])) : v;
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
export async function readCheckoutReplay<T>(db: Firestore, uid: string, id: string, request: unknown): Promise<T | null> {
  const doc = await checkoutAttemptRef(db, uid, id).get();
  if (!doc.exists) return null;
  if (doc.data()?.rejected) throw Object.assign(new Error('Checkout attempt was rejected. Review a fresh quote.'), { statusCode: 409 });
  if (doc.data()?.hash !== checkoutRequestHash(request)) throw Object.assign(new Error('Checkout attempt payload conflict'), { statusCode: 409 });
  return doc.data()!.result as T;
}
/** Order/draft, counters and response journal commit in the SAME Firestore transaction. No TTL reuse. */
export async function commitCheckoutAttempt<T>(db: Firestore, uid: string, id: string, request: unknown, result: T, write: (tx: Transaction) => void): Promise<T> {
  const ref = checkoutAttemptRef(db, uid, id);
  const hash = checkoutRequestHash(request);
  return db.runTransaction(async tx => {
    const previous = await tx.get(ref);
    if (previous.exists) {
      if (previous.data()?.rejected) throw Object.assign(new Error('Checkout attempt was rejected'), { statusCode: 409 });
      if (previous.data()?.hash !== hash) throw Object.assign(new Error('Checkout attempt payload conflict'), { statusCode: 409 });
      return previous.data()!.result as T;
    }
    write(tx);
    tx.create(ref, { userId: uid, hash, result, createdAt: new Date().toISOString() });
    return result;
  });
}
/** External provider calls cannot be atomic with Firestore. Never take over an ambiguous reservation. */
export async function createPaymentIntentOnce<T>(db: Firestore, draftId: string, create: () => Promise<T>): Promise<T> {
  const ref = db.collection('customer_payment_intents').doc(draftId);
  const replay = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      if (snap.data()?.state === 'complete') return snap.data()!.result as T;
      throw Object.assign(new Error('Payment intent outcome is pending. Check order status; do not pay again.'), { statusCode: 409 });
    }
    tx.create(ref, { state: 'pending', createdAt: new Date().toISOString() });
    return null;
  });
  if (replay) return replay;
  const result = await create();
  await ref.update({ state: 'complete', result });
  return result;
}

export async function rejectCheckoutAttempt(db: Firestore, uid: string, id: string): Promise<void> {
  const ref = checkoutAttemptRef(db, uid, id);
  await db.runTransaction(async tx => {
    if (!(await tx.get(ref)).exists) tx.create(ref, { rejected: true, userId: uid });
  });
}
