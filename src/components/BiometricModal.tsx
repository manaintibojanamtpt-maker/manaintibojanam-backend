import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Fingerprint, Smartphone, ShieldCheck, X, ShieldAlert } from 'lucide-react';

interface BiometricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onFallback?: () => void;
  type: 'onboarding' | 'unlock';
  biometryType?: any;
}

const BiometricModal: React.FC<BiometricModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onFallback,
  type,
  biometryType 
}) => {
  const isFaceID = String(biometryType || '').toLowerCase().includes('face');
  const Icon = isFaceID ? Smartphone : Fingerprint;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={type === 'onboarding' ? onClose : undefined}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <m.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl shadow-orange-500/10"
          >
            {/* Header Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-2/3 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

            {type === 'onboarding' && (
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            )}

            <div className="p-8 text-center">
              {/* Icon Animation */}
              <div className="relative mb-6 flex justify-center">
                <m.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 text-orange-500 shadow-inner"
                >
                  <Icon size={48} />
                </m.div>
                
                {/* Pulsing circles */}
                <m.div 
                  animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-orange-500/20"
                />
              </div>

              <h2 className="mb-2 text-2xl font-bold text-white">
                {type === 'onboarding' ? 'Secure Your Account' : 'App Locked'}
              </h2>
              
              <p className="mb-8 text-zinc-400">
                {type === 'onboarding' 
                  ? `Enable ${biometryType || 'Biometrics'} for instant, secure access to your account without typing passwords.` 
                  : 'Verify your identity to continue using BhojanOS.'}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={onConfirm}
                  className="w-full rounded-2xl bg-orange-500 py-4 font-bold text-white shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={20} />
                  {type === 'onboarding' ? `Use ${biometryType || 'Biometrics'}` : 'Verify Identity'}
                </button>

                {type === 'onboarding' ? (
                  <button
                    onClick={onClose}
                    className="w-full rounded-2xl bg-zinc-800 py-4 font-bold text-zinc-300 active:scale-[0.98] transition-transform"
                  >
                    Maybe Later
                  </button>
                ) : (
                  <button
                    onClick={onFallback || (() => window.location.href = '/login')}
                    className="w-full rounded-2xl border border-zinc-800 py-4 font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Use Another Method
                  </button>
                )}
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-600">
                <ShieldCheck size={14} />
                <span>Your biometric data never leaves this device</span>
              </div>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BiometricModal;
