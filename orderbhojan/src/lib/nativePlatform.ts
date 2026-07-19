import { Capacitor } from '@capacitor/core';

const EXTERNAL_SCHEME = /^(https?:|mailto:|tel:|tez:|phonepe:|paytmmp:|upi:|intent:)/i;

export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const platform = Capacitor.getPlatform();
  if (platform === 'android' || platform === 'ios') return true;
  return Capacitor.isNativePlatform();
}

export function skipPwaInstallPrompt(): boolean {
  return isNativePlatform();
}

export function shouldUseGoogleAuthRedirect(): boolean {
  if (typeof window === 'undefined') return false;
  if (isNativePlatform()) return true;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isStandalone;
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
      // Fall through.
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
