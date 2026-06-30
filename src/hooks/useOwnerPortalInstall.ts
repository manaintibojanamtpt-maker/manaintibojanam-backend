import { useCallback, useEffect, useState } from 'react';
import { isIosSafari } from '../lib/tenantPwaManifest';
import { isStandalonePwa } from '../lib/pwaUtils';

const DISMISS_KEY = 'bhojanos_owner_portal_install_dismissed';

function isOwnerPortalPath(pathname = typeof window !== 'undefined' ? window.location.pathname : ''): boolean {
  return pathname.startsWith('/owner') && pathname !== '/owner/login' && pathname !== '/owner/register';
}

/** Chromium beforeinstallprompt — not in default TS lib */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** PWA install prompt for the BhojanOS owner portal (home-screen order alerts). */
export function useOwnerPortalInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalonePwa());
  const [dismissed, setDismissed] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1',
  );

  const onOwnerPortal = typeof window !== 'undefined' && isOwnerPortalPath();
  const ios = typeof window !== 'undefined' && isIosSafari();
  const canNativeInstall = Boolean(deferredPrompt);
  const showInstallBanner = onOwnerPortal && !installed && !dismissed;

  useEffect(() => {
    if (!onOwnerPortal || installed) return;

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
  }, [onOwnerPortal, installed]);

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
    showInstallBanner,
    installed,
    ios,
    canNativeInstall,
    triggerInstall,
    dismiss,
  };
}
