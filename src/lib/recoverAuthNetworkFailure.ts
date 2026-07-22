/**
 * Recover from auth/network-request-failed caused by a stale service worker
 * after marketing/app.html cutovers. Unregisters SW, clears auth caches, reloads once.
 */

const RECOVERY_KEY = 'bhojanos_auth_network_recovery';

function readAuthErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: string }).code ?? '');
  }
  return '';
}

export function isAuthNetworkFailure(error: unknown): boolean {
  const code = readAuthErrorCode(error);
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: string }).message ?? '')
        : String(error ?? '');
  return (
    code === 'auth/network-request-failed' ||
    (/network|failed to fetch|fetch failed/i.test(message) && !/invalid.?credential/i.test(message))
  );
}

export async function recoverAuthNetworkFailure(error: unknown): Promise<boolean> {
  if (typeof window === 'undefined' || !isAuthNetworkFailure(error)) return false;

  try {
    if (sessionStorage.getItem(RECOVERY_KEY) === '1') return false;
    sessionStorage.setItem(RECOVERY_KEY, '1');
  } catch {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister().catch(() => undefined)));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key).catch(() => false)));
    }
  } catch {
    // still reload — version bootstrap / hard refresh path
  }

  window.location.reload();
  return true;
}

export function clearAuthNetworkRecoveryFlag(): void {
  try {
    sessionStorage.removeItem(RECOVERY_KEY);
  } catch {
    /* ignore */
  }
}
