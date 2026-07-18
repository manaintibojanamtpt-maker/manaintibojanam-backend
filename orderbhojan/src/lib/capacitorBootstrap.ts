import { isNativePlatform } from './nativePlatform';

declare global {
  interface Window {
    __SKIP_SPLASH__?: boolean;
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
    } catch {
      // iOS ignores backgroundColor.
    }

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

  try {
    const { App } = await import('@capacitor/app');
    await App.addListener('appUrlOpen', ({ url }) => {
      if (!url) return;
      try {
        const parsed = new URL(url);
        const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
        if (path && path !== window.location.pathname) {
          window.history.replaceState({}, '', path);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      } catch {
        // Ignore malformed deep links.
      }
    });
  } catch {
    // Optional during scaffold phase.
  }
}
