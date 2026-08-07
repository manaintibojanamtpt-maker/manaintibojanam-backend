import { Capacitor } from '@capacitor/core';

import { isNativePlatform } from './nativePlatform';

import { obDebugLog } from './obDebug';
import { bootstrapNativePushListeners } from './nativePushNotifications';

declare global {
  interface Window {
    __SKIP_SPLASH__?: boolean;
  }
}

const ANDROID_STATUS_BAR_FALLBACK_PX = 28;
const ANDROID_GESTURE_BAR_FALLBACK_PX = 48;
const IOS_STATUS_BAR_FALLBACK_PX = 47;

function applyNativeSafeAreaInsets(): void {
  if (!isNativePlatform() || typeof document === 'undefined') return;

  const platform = Capacitor.getPlatform();
  document.documentElement.classList.add('ob-native', `ob-native-${platform}`);

  const readEnvInset = (name: '--ob-safe-top' | '--ob-safe-bottom'): number => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const fallbackTop = platform === 'ios' ? IOS_STATUS_BAR_FALLBACK_PX : ANDROID_STATUS_BAR_FALLBACK_PX;
  const envTop = readEnvInset('--ob-safe-top');
  const envBottom = readEnvInset('--ob-safe-bottom');
  const viewportTop = window.visualViewport?.offsetTop ?? 0;

  const top = Math.max(envTop, viewportTop, fallbackTop);
  const bottomFallback = platform === 'ios' ? 20 : ANDROID_GESTURE_BAR_FALLBACK_PX;
  const bottom = Math.max(envBottom, bottomFallback);

  document.documentElement.style.setProperty('--ob-safe-top', `${top}px`);
  document.documentElement.style.setProperty('--ob-safe-bottom', `${bottom}px`);
  obDebugLog('safe-area', 'Applied native insets', { top, bottom, platform });
}

async function unregisterServiceWorkersOnNative(): Promise<void> {
  if (!isNativePlatform() || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    obDebugLog('sw', 'Unregistered service workers on native');
  } catch {
    // Non-fatal if unregister fails.
  }
}

async function routeDeepLink(url: string): Promise<void> {
  try {
    const { tryOpenNativeTrackFromPath } = await import('@/features/nativeTrack/nativeTrackBridge');
    const native = await tryOpenNativeTrackFromPath(url, { source: 'deeplink' });
    if (native.opened) {
      obDebugLog('deeplink', 'Native track opened', native.orderId);
      return;
    }

    const parsed = new URL(url);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!path || path === window.location.pathname + window.location.search + window.location.hash) {
      return;
    }
    window.history.replaceState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    obDebugLog('deeplink', 'Routed app URL (hybrid)', path);
  } catch {
    // Ignore malformed deep links.
  }
}

export async function bootstrapCapacitorNative(): Promise<void> {
  if (!isNativePlatform()) return;

  window.__SKIP_SPLASH__ = true;
  document.getElementById('ob-boot-shell')?.remove();

  await unregisterServiceWorkersOnNative();

  try {
    const [{ StatusBar, Style }] = await Promise.all([
      import('@capacitor/status-bar'),
    ]);

    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#070504' });
      await StatusBar.setOverlaysWebView({ overlay: true });
    } catch {
      // iOS ignores backgroundColor / overlay on some versions.
    }

    applyNativeSafeAreaInsets();
    window.visualViewport?.addEventListener('resize', applyNativeSafeAreaInsets);
    window.addEventListener('orientationchange', applyNativeSafeAreaInsets);

    try {
      // Splash screen is intentionally NOT hidden here.
      // It will be hidden by the app shell (AppRouter) once mounted
      // to prevent white flashes during React render.
    } catch {
      // Non-fatal.
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[OrderBhojan] Capacitor native bootstrap skipped', error);
    }
  }

  try {
    const { configureNativeTrackHost } = await import('@/features/nativeTrack/nativeTrackBridge');
    await configureNativeTrackHost();
  } catch {
    // Flags stay OFF on native host prefs.
  }

  await bootstrapNativePushListeners();

  try {
    const { App } = await import('@capacitor/app');
    await App.addListener('appUrlOpen', ({ url }) => {
      if (!url) return;
      void routeDeepLink(url);
    });
  } catch {
    // Optional during scaffold phase.
  }
}
