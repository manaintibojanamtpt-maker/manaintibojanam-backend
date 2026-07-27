/**
 * Optional native Android STT bridge (Capacitor plugin) — OFF unless FF_OB_AI_NATIVE_STT.
 * Safe no-op scaffold: never throws; Web Speech remains the default path.
 */

export type NativeAndroidSttResult = {
  readonly transcript: string;
  readonly confidence?: number;
};

type NativeSttPlugin = {
  startListening: (opts: {
    language?: string;
    prompt?: string;
  }) => Promise<NativeAndroidSttResult>;
  stopListening?: () => Promise<void>;
};

function getNativeSttPlugin(): NativeSttPlugin | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    OrderBhojanNativeStt?: NativeSttPlugin;
    Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, unknown> };
  };
  if (w.OrderBhojanNativeStt?.startListening) return w.OrderBhojanNativeStt;
  const plugin = w.Capacitor?.Plugins?.OrderBhojanNativeStt as NativeSttPlugin | undefined;
  if (plugin?.startListening) return plugin;
  return null;
}

export function isNativeAndroidSttAvailable(): boolean {
  try {
    return getNativeSttPlugin() != null;
  } catch {
    return false;
  }
}

/**
 * Attempt native STT when the feature flag is on and a bridge exists.
 * Returns null so callers fall back to Web Speech / WebView path.
 */
export async function captureNativeAndroidStt(input: {
  readonly enabled: boolean;
  readonly lang?: string;
  readonly signal?: AbortSignal;
}): Promise<NativeAndroidSttResult | null> {
  if (!input.enabled) return null;
  const plugin = getNativeSttPlugin();
  if (!plugin) return null;
  if (input.signal?.aborted) return null;

  const onAbort = () => {
    void plugin.stopListening?.();
  };
  input.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const result = await plugin.startListening({
      language: input.lang ?? 'en-IN',
      prompt: 'Say a dish and kitchen…',
    });
    const transcript = result?.transcript?.trim();
    if (!transcript) return null;
    return { transcript, confidence: result.confidence };
  } catch {
    return null;
  } finally {
    input.signal?.removeEventListener('abort', onAbort);
  }
}
