import { useCallback, useEffect, useState } from 'react';
import { isIosSafari, isStorefrontInstallPath } from '../lib/tenantPwaManifest';
import { isStandalonePwa } from '../lib/pwaUtils';

const DISMISS_KEY = 'bhojanos_storefront_install_dismissed';

export function useStorefrontInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalonePwa());
  const [dismissed, setDismissed] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1',
  );

  const onStorefront = typeof window !== 'undefined' && isStorefrontInstallPath();
  const ios = typeof window !== 'undefined' && isIosSafari();
  const canNativeInstall = Boolean(deferredPrompt);
  const showInstallAction = onStorefront && !installed && !dismissed;

  useEffect(() => {
    if (!onStorefront) return;

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [onStorefront]);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') setInstalled(true);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  return {
    showInstallAction,
    installed,
    ios,
    canNativeInstall,
    triggerInstall,
    dismiss,
  };
}

/** Chromium beforeinstallprompt — not in default TS lib */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
