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

  const bottom = Math.max(envBottom, platform === 'ios' ? 20 : 0);



  document.documentElement.style.setProperty('--ob-safe-top', `${top}px`);

  document.documentElement.style.setProperty('--ob-safe-bottom', `${bottom}px`);

  obDebugLog('safe-area', 'Applied native insets', { top, bottom, platform });

}



function routeDeepLink(url: string): void {

  try {

    const parsed = new URL(url);

    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    if (!path || path === window.location.pathname + window.location.search + window.location.hash) {

      return;

    }

    window.history.replaceState({}, '', path);

    window.dispatchEvent(new PopStateEvent('popstate'));

    obDebugLog('deeplink', 'Routed app URL', path);

  } catch {

    // Ignore malformed deep links.

  }

}



export async function bootstrapCapacitorNative(): Promise<void> {

  if (!isNativePlatform()) return;



  window.__SKIP_SPLASH__ = true;

  document.getElementById('ob-boot-shell')?.remove();



  try {

    const [{ SplashScreen }, { StatusBar, Style }] = await Promise.all([

      import('@capacitor/splash-screen'),

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

      await SplashScreen.hide({ fadeOutDuration: 200 });

    } catch {

      // Non-fatal.

    }

  } catch (error) {

    if (import.meta.env.DEV) {

      console.warn('[OrderBhojan] Capacitor native bootstrap skipped', error);

    }

  }



  await bootstrapNativePushListeners();



  try {

    const { App } = await import('@capacitor/app');

    await App.addListener('appUrlOpen', ({ url }) => {

      if (!url) return;

      routeDeepLink(url);

    });

  } catch {

    // Optional during scaffold phase.

  }

}


