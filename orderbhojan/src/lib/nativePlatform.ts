import { Capacitor } from '@capacitor/core';

import { logUpiDiag } from './upiDiagnostics';

const EXTERNAL_SCHEME =
  /^(https?:|mailto:|tel:|tez:|gpay:|phonepe:|paytmmp:|upi:|intent:)/i;

export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const platform = Capacitor.getPlatform();
  if (platform === 'android' || platform === 'ios') return true;
  return Capacitor.isNativePlatform();
}

export function skipPwaInstallPrompt(): boolean {
  return isNativePlatform();
}

/**
 * Prefer redirect only when popup is unavailable.
 * Chrome bounce-tracking breaks cross-origin redirect via *.firebaseapp.com,
 * so web clients must use signInWithPopup (hosting omits COOP so window.closed works).
 */
export function shouldUseGoogleAuthRedirect(): boolean {
  if (typeof window === 'undefined') return false;
  // Capacitor Android/iOS use @capacitor-firebase/authentication — not web redirect/popup.
  if (isNativePlatform()) return false;
  return false;
}

/** True when a popup failure should fall back to redirect (rare / popup blockers). */
export function shouldFallbackGoogleAuthRedirect(error: unknown): boolean {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code ?? '')
      : '';
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    code === 'auth/popup-blocked' ||
    /cross-origin-opener|window\.closed|Unable to establish a connection/i.test(message)
  );
}

function launchAnchorFallback(url: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => anchor.remove(), 0);
}

export async function openExternalUrl(url: string): Promise<boolean> {
  const trimmed = url.trim();
  if (!trimmed || typeof window === 'undefined') return false;

  const scheme =
    /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(trimmed)?.[1]?.toLowerCase() ?? 'unknown';

  if (isNativePlatform()) {
    // Kitchen UPI VPA: open installed apps via native startActivity (not WebView).
    if (/^(upi:|intent:|tez:|gpay:|phonepe:|paytmmp:)/i.test(trimmed)) {
      try {
        const { nativeOpenUpiPayUrl } = await import(
          '@/features/checkout/infrastructure/nativeUpiBridge'
        );
        const opened = await nativeOpenUpiPayUrl(trimmed);
        logUpiDiag('transport', { path: 'native-plugin', scheme, opened });
        if (opened) return true;
      } catch {
        logUpiDiag('transport', { path: 'native-plugin-error', scheme });
      }
      logUpiDiag('transport', { path: 'native-location', scheme });
      window.location.assign(trimmed);
      return true;
    }

    try {
      const { App } = await import('@capacitor/app');
      const appPlugin = App as typeof App & {
        openUrl?: (options: { url: string }) => Promise<{ completed: boolean }>;
      };
      if (typeof appPlugin.openUrl === 'function') {
        await appPlugin.openUrl({ url: trimmed });
        logUpiDiag('transport', { path: 'app-openurl', scheme });
        return true;
      }
    } catch {
      // Fall through.
    }

    if (/^https?:/i.test(trimmed)) {
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: trimmed, presentationStyle: 'popover' });
        logUpiDiag('transport', { path: 'browser-capacitor', scheme });
        return true;
      } catch {
        // Fall through.
      }
    }

    if (EXTERNAL_SCHEME.test(trimmed)) {
      logUpiDiag('transport', { path: 'native-location-external', scheme });
      window.location.assign(trimmed);
      return true;
    }

    logUpiDiag('transport', { path: 'anchor', scheme });
    launchAnchorFallback(trimmed);
    return true;
  }

  // On Web/PWA, hidden anchor clicks for deep links are often blocked by Chrome.
  // Use direct location assignment for intent/upi schemes.
  if (/^(intent:|upi:|gpay:|phonepe:|paytmmp:|tez:)/i.test(trimmed)) {
    logUpiDiag('transport', { path: 'web-location', scheme });
    window.location.assign(trimmed);
    return true;
  }

  launchAnchorFallback(trimmed);
  return true;
}
