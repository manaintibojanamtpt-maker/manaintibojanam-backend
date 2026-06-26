import { AnimatePresence, m } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
// @ts-ignore - provided by vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PwaUpdatePrompt: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [updating, setUpdating] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('[PWA] Service Worker registered:', r);
      if (r) {
        setInterval(() => {
          r.update().catch(console.error);
        }, 60 * 1000);
      }
    },
    onRegisterError(error: unknown) {
      console.error('[PWA] Service worker registration error', error);
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    setNeedRefresh(false);
  }, [setNeedRefresh]);

  const handleUpdateNow = useCallback(async () => {
    if (updating) return;
    setUpdating(true);

    let reloaded = false;
    const forceReload = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      navigator.serviceWorker?.addEventListener('controllerchange', forceReload, { once: true });

      await updateServiceWorker(true);

      window.setTimeout(forceReload, 1500);
    } catch (error) {
      console.error('[PWA] Update failed, forcing reload:', error);
      forceReload();
    }
  }, [updateServiceWorker, updating]);

  if (!mounted || !needRefresh) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      <m.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-update-title"
        initial={{ opacity: 0, y: 100, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.96 }}
        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
        className="fixed inset-x-0 bottom-0 z-[2147483646] flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        style={{ touchAction: 'manipulation' }}
      >
        <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-[#ff6b35]/20 bg-[#1a1410] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8),0_0_30px_-10px_rgba(255,107,53,0.3)] backdrop-blur-xl">
          <div className="flex items-start gap-4 p-4">
            <div className="mt-0.5 rounded-full border border-[#ff6b35]/20 bg-[#ff6b35]/10 p-2">
              <RefreshCw className={`h-5 w-5 text-[#ff9f1c] ${updating ? 'animate-spin' : ''}`} />
            </div>
            <div className="flex-1">
              <h3 id="pwa-update-title" className="mb-1 text-sm font-bold tracking-wide text-white">
                Update Available
              </h3>
              <p className="text-xs leading-relaxed text-[#b9ada1]">
                A new version of BhojanOS is ready. Get a faster experience and new improvements!
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              disabled={updating}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300 disabled:opacity-40"
              aria-label="Dismiss update"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex border-t border-white/5 bg-black/20">
            <button
              type="button"
              disabled={updating}
              className="flex min-h-[52px] flex-1 items-center justify-center text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
              onClick={close}
            >
              Later
            </button>
            <div className="w-px bg-white/5" />
            <button
              type="button"
              disabled={updating}
              className="flex min-h-[52px] flex-1 items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ff6b35] transition-colors hover:bg-[#ff6b35]/10 hover:text-[#ff9f1c] disabled:opacity-70"
              onClick={handleUpdateNow}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {updating ? 'Updating…' : 'Update Now'}
            </button>
          </div>
        </div>
      </m.div>
    </AnimatePresence>,
    document.body
  );
};
