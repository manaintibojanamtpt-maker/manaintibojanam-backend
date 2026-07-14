/** True when Firestore rules reject the request (guest, stale session, or rules mismatch). */
export function isFirestorePermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  if (code === 'permission-denied') return true;
  if (error instanceof Error) {
    return /missing or insufficient permissions/i.test(error.message);
  }
  return false;
}
