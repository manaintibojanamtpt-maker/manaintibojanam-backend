import { getOwnerPostAuthPath } from './ownerAccess';

const DEFAULT_REDIRECT_TIMEOUT_MS = 8_000;

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

/** Resolve owner destination — dashboard-first; setup wizard only via StoreSetupGuide links. */
export async function resolveOwnerDestination(
  uid: string,
  email?: string | null,
  knownTenantIds?: string[],
): Promise<string> {
  try {
    return await withTimeout(
      getOwnerPostAuthPath(uid, email, { knownTenantIds }),
      DEFAULT_REDIRECT_TIMEOUT_MS,
      'Owner redirect',
    );
  } catch (error) {
    console.warn('resolveOwnerDestination fallback:', error);
    if (knownTenantIds && knownTenantIds.length > 0) {
      return '/owner/dashboard';
    }
    return '/owner/login';
  }
}
