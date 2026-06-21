import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import React from 'react';
// @ts-ignore - provided by vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PwaUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('[PWA] Service Worker registered:', r);
      if (r) {
        // Check for updates every 1 minute
        setInterval(() => {
          console.log('[PWA] Checking for updates...');
          r.update().catch(console.error);
        }, 60 * 1000);
      }
    },
    onRegisterError(error: any) {
      console.error('[PWA] Service worker registration error', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[99999] p-4 pointer-events-none pb-[env(safe-area-inset-bottom)] flex justify-center"
        >
          <div className="pointer-events-auto bg-[#1a1410] border border-[#ff6b35]/20 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8),0_0_30px_-10px_rgba(255,107,53,0.3)] rounded-2xl w-full max-w-sm overflow-hidden flex flex-col backdrop-blur-xl">
            
            <div className="p-4 flex items-start gap-4">
              <div className="bg-[#ff6b35]/10 p-2 rounded-full mt-0.5 border border-[#ff6b35]/20">
                <RefreshCw className="w-5 h-5 text-[#ff9f1c] animate-spin-slow" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-sm mb-1 tracking-wide">Update Available</h3>
                <p className="text-[#b9ada1] text-xs leading-relaxed">
                  A new version of BhojanOS is ready. Get a faster experience and new improvements!
                </p>
              </div>
              <button 
                onClick={close}
                className="text-gray-500 hover:text-gray-300 transition-colors p-1"
                aria-label="Dismiss update"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex border-t border-white/5 bg-black/20">
              <button
                className="flex-1 py-3 text-xs font-semibold text-gray-400 hover:text-white transition-colors uppercase tracking-wider"
                onClick={close}
              >
                Later
              </button>
              <div className="w-px bg-white/5"></div>
              <button
                className="flex-1 py-3 text-xs font-bold text-[#ff6b35] hover:text-[#ff9f1c] hover:bg-[#ff6b35]/5 transition-colors uppercase tracking-wider flex items-center justify-center gap-2"
                onClick={() => updateServiceWorker(true)}
              >
                Update Now
              </button>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
