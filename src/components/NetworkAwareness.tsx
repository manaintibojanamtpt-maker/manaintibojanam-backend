import React, { useEffect, useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface NetworkAwarenessProps {
  connected: boolean;
  loading: boolean;
  retry: () => void;
}

const NetworkAwareness: React.FC<NetworkAwarenessProps> = ({ connected, loading, retry }) => {
  const [isBrowserOnline, setIsBrowserOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    setIsBrowserOnline(true);
    toast.success("You're back online!", {
      icon: <Wifi size={18} className="text-emerald-500" />,
      duration: 3000,
      position: 'top-center',
      style: {
        borderRadius: '20px',
        background: 'rgba(10, 10, 10, 0.9)',
        color: '#fff',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        fontWeight: 800,
        fontSize: '13px',
        padding: '12px 20px',
      },
    });
    setWasOffline(false);
  }, []);

  const handleOffline = useCallback(() => {
    setIsBrowserOnline(false);
    setWasOffline(true);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Combined connection status
  const isActuallyConnected = isBrowserOnline && connected;
  const showOfflineUI = !isBrowserOnline || (!connected && !loading);

  return (
    <AnimatePresence>
      {showOfflineUI && (
        <m.div
          initial={{ y: -50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -50, opacity: 0, scale: 0.95 }}
          className="fixed left-0 right-0 z-[99999] flex justify-center px-4 pointer-events-none"
          style={{ top: 'calc(1rem + env(safe-area-inset-top, 20px))' }}
        >
          <div className="pointer-events-auto bg-black/80 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[2rem] px-5 py-3 flex items-center gap-4 max-w-[320px] w-full">
            <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <WifiOff size={18} className="text-red-500 animate-pulse" />
            </div>
            
            <div className="flex-1">
              <p className="text-xs font-black text-white tracking-tight uppercase">Connection Lost</p>
              <p className="text-[10px] font-bold text-white/40 leading-none mt-0.5">Check your internet</p>
            </div>

            <button
              onClick={() => {
                if (navigator.onLine) retry();
              }}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-90"
              title="Retry Connection"
            >
              <RefreshCw size={14} className={`text-white ${!isBrowserOnline ? 'opacity-30' : ''}`} />
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(NetworkAwareness);
