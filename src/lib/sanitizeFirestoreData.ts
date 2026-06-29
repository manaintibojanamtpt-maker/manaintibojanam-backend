/** Firestore rejects `undefined` anywhere in a document — convert to `null` or omit. */
function isFirestoreSentinel(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate._methodName === 'string' || typeof candidate._delegate === 'object';
}

export function sanitizeFirestoreData<T>(value: T): T {
  if (value === undefined) {
    return null as T;
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date || isFirestoreSentinel(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeFirestoreData(entry)) as T;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    sanitized[key] = entry === undefined ? null : sanitizeFirestoreData(entry);
  }

  return sanitized as T;
}
