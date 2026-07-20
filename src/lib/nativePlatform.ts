import { Capacitor } from '@capacitor/core';

const EXTERNAL_SCHEME = /^(https?:|mailto:|tel:|tez:|phonepe:|paytmmp:|upi:|intent:)/i;

export function isNativePlatform(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

export function isCapacitorNative(): boolean {
  return isNativePlatform();
}

/** PWA install / update prompts are irrelevant inside native shells. */
export function skipPwaInstallPrompt(): boolean {
  return isNativePlatform();
}

export function shouldUseGoogleAuthRedirect(): boolean {
  if (typeof window === 'undefined') return false;
  // Capacitor Android/iOS use native Firebase Authentication — not web redirect/popup.
  if (isNativePlatform()) return false;
  // Hosted sites send Cross-Origin-Opener-Policy headers that break signInWithPopup.
  return true;
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

/**
 * Opens payment deep links and external URLs from WebView contexts.
 * Uses Capacitor Browser for http(s) and anchor / location fallback for UPI schemes.
 */
export async function openExternalUrl(url: string): Promise<boolean> {
  const trimmed = url.trim();
  if (!trimmed || typeof window === 'undefined') return false;

  if (isNativePlatform()) {
    try {
      const { App } = await import('@capacitor/app');
      const appPlugin = App as typeof App & {
        openUrl?: (options: { url: string }) => Promise<{ completed: boolean }>;
      };
      if (typeof appPlugin.openUrl === 'function') {
        await appPlugin.openUrl({ url: trimmed });
        return true;
      }
    } catch {
      // Fall through to Browser / anchor fallback.
    }

    if (/^https?:/i.test(trimmed)) {
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: trimmed, presentationStyle: 'popover' });
        return true;
      } catch {
        // Fall through.
      }
    }

    if (EXTERNAL_SCHEME.test(trimmed)) {
      window.location.assign(trimmed);
      return true;
    }

    launchAnchorFallback(trimmed);
    return true;
  }

  launchAnchorFallback(trimmed);
  return true;
}
