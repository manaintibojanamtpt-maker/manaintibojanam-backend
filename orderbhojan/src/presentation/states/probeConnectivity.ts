const DEFAULT_PROBE_PATHS = ['/favicon.svg', '/manifest.webmanifest'] as const;
const DEFAULT_PROBE_TIMEOUT_MS = 5000;

async function probePath(
  origin: string,
  path: string,
  signal: AbortSignal,
): Promise<boolean> {
  const response = await fetch(`${origin}${path}`, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
    signal,
  });
  return response.ok;
}

/** Presentation-only reachability probe. Defaults to online when evidence is inconclusive. */
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

  const paths = options?.path ? [options.path] : DEFAULT_PROBE_PATHS;

  try {
    for (const path of paths) {
      try {
        if (await probePath(window.location.origin, path, controller.signal)) {
          return true;
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          break;
        }
      }
    }

    // Never hard-block the app on a flaky offline signal.
    return true;
  } finally {
    window.clearTimeout(timer);
    options?.signal?.removeEventListener('abort', onAbort);
  }
}
