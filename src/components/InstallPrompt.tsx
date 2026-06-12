import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useCart } from '../context/CartContext';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const { cart } = useCart();

  useEffect(() => {
    if (deferredPrompt && cart.length > 0 && !showPrompt) {
      setShowPrompt(true);
    }
  }, [cart, deferredPrompt]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after 30 seconds of browsing
      setTimeout(() => setShowPrompt(true), 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
        setShowPrompt(false);
      });
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-[calc(144px+env(safe-area-inset-bottom))] left-4 right-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between z-[60] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-red-600">
          <Download size={20} />
        </div>
        <div>
          <p className="text-xs font-black text-gray-900 dark:text-white tracking-tight">Install App</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Get a better home-style experience</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={handleInstall} 
          className="bg-red-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all"
        >
          Install
        </button>
        <button 
          onClick={() => setShowPrompt(false)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
