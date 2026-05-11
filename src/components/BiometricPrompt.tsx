import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, X, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { registerBiometric } from '../services/biometrics';
import toast from 'react-hot-toast';

interface BiometricPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

const BiometricPrompt: React.FC<BiometricPromptProps> = ({ isOpen, onClose }) => {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const success = await registerBiometric(
        currentUser.uid, 
        currentUser.email, 
        userProfile?.name || currentUser.displayName
      );
      
      if (success) {
        toast.success('Face ID / Fingerprint enabled!');
        onClose();
      }
    } catch (error: any) {
      // User might have cancelled the native prompt
      if (!error.message?.includes('cancelled') && !error.message?.includes('timed out')) {
        toast.error('Failed to enable biometrics. Please try again.');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!loading ? onClose : undefined}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99998]"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[99999] bg-[#120d0a] rounded-t-[2.5rem] border-t border-[#ff6b35]/20 pb-[env(safe-area-inset-bottom)] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Handle Bar */}
            <div className="w-full flex justify-center pt-4 pb-2">
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>

            <div className="px-6 pb-8 pt-4 relative">
              <button 
                onClick={onClose}
                disabled={loading}
                className="absolute top-4 right-6 p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center mt-2">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-[#ff6b35]/20 blur-xl rounded-full scale-150"></div>
                  <div className="w-20 h-20 bg-gradient-to-br from-[#ff6b35] to-[#ff9f1c] rounded-[2rem] flex items-center justify-center relative z-10 shadow-[0_10px_30px_rgba(255,107,53,0.4)]">
                    <Fingerprint className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1.5 border-4 border-[#120d0a] z-20">
                    <ShieldCheck className="w-4 h-4 text-white" />
                  </div>
                </div>

                <h2 className="text-2xl font-black text-white mb-3 tracking-tight">
                  Faster, Secure Login
                </h2>
                
                <p className="text-[#b9ada1] text-[15px] leading-relaxed mb-8 px-4">
                  Enable Face ID or Fingerprint to log into Mana Inti Bojanam instantly without passwords or OTPs.
                </p>

                <div className="w-full space-y-3">
                  <button
                    onClick={handleEnable}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c] text-white font-bold text-[15px] py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(255,107,53,0.3)] hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Fingerprint className="w-5 h-5" />
                        Enable Biometrics
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="w-full bg-transparent text-gray-400 font-bold text-[15px] py-4 rounded-2xl hover:text-white transition-colors active:scale-[0.98]"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BiometricPrompt;
