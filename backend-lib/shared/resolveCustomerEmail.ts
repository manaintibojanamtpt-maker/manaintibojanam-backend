import type { Firestore } from 'firebase-admin/firestore';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeCustomerEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || !EMAIL_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function resolveCustomerEmailFromOrder(order: Record<string, unknown>): string | null {
  return (
    normalizeCustomerEmail(order.userEmail) ||
    normalizeCustomerEmail(order.email) ||
    normalizeCustomerEmail(order.customerEmail) ||
    normalizeCustomerEmail(order.notificationEmail)
  );
}

export async function resolveCustomerNotificationEmail(
  db: Firestore,
  order: Record<string, unknown>,
): Promise<string | null> {
  const direct = resolveCustomerEmailFromOrder(order);
  if (direct) return direct;

  const userId = typeof order.userId === 'string' ? order.userId.trim() : '';
  if (!userId) return null;

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return null;
    const userData = userDoc.data() || {};
    return (
      normalizeCustomerEmail(userData.email) ||
      normalizeCustomerEmail(userData.notificationEmail) ||
      normalizeCustomerEmail(userData.contactEmail)
    );
  } catch {
    return null;
  }
}
