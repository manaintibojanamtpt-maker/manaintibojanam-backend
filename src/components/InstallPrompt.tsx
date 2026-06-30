import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTenant } from '../context/TenantContext';
import { useStorefrontInstall } from '../hooks/useStorefrontInstall';

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const { cart } = useCart();
  const { tenantInfo } = useTenant();
  const { showInstallAction, ios, canNativeInstall, triggerInstall, dismiss } = useStorefrontInstall();

  const kitchenName = tenantInfo?.name || 'this kitchen';

  useEffect(() => {
    if (!showInstallAction) return;

    if (canNativeInstall && cart.length > 0) {
      setShowPrompt(true);
      return;
    }

    if (ios) {
      const timer = window.setTimeout(() => setShowPrompt(true), 45_000);
      return () => window.clearTimeout(timer);
    }

    if (canNativeInstall) {
      const timer = window.setTimeout(() => setShowPrompt(true), 60_000);
      return () => window.clearTimeout(timer);
    }
  }, [cart, canNativeInstall, ios, showInstallAction]);

  const handleInstall = async () => {
    const accepted = await triggerInstall();
    if (accepted) setShowPrompt(false);
  };

  const handleDismiss = () => {
    dismiss();
    setShowPrompt(false);
  };

  if (!showInstallAction || !showPrompt) return null;

  return (
    <div className="fixed bottom-[calc(144px+env(safe-area-inset-bottom))] left-4 right-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 z-[60] animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-red-600 shrink-0">
          {ios ? <Share size={20} /> : <Download size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-gray-900 dark:text-white tracking-tight">
            Add {kitchenName} to your home screen
          </p>
          {ios ? (
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1 leading-relaxed">
              Use the <strong>Install</strong> button in the header, or Share → Add to Home Screen in Safari.
            </p>
          ) : (
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1 leading-relaxed">
              Install for one-tap ordering and faster checkout.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0"
          aria-label="Dismiss install prompt"
        >
          <X size={16} />
        </button>
      </div>

      {!ios && canNativeInstall && (
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="w-full mt-3 bg-red-600 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all"
        >
          Install app
        </button>
      )}
    </div>
  );
};

export default InstallPrompt;
