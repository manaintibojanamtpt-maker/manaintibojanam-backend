const DEFAULT_PROBE_PATH = '/favicon.svg';
const DEFAULT_PROBE_TIMEOUT_MS = 5000;

export async function probeSameOriginReachable(options?: {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly path?: string;
}): Promise<boolean> {
  if (typeof window === 'undefined') return true;

  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  options?.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const response = await fetch(`${window.location.origin}${options?.path ?? DEFAULT_PROBE_PATH}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    // iOS Safari can report navigator.onLine=false while the network still works.
    // Prefer staying usable when the browser thinks it is online.
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  } finally {
    window.clearTimeout(timer);
    options?.signal?.removeEventListener('abort', onAbort);
  }
}
