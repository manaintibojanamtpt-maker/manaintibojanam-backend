import React, { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import { Fingerprint, Lock, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BiometricService } from '../services/biometric.service';
import { toast } from 'react-hot-toast';
import logo from '../assets/logo.webp';

interface BiometricLockScreenProps {
  onUnlock: () => void;
}

const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({ onUnlock }) => {
  const { logout } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = autoTrigger(true);

  // Helper hook to trigger auth on mount
  function autoTrigger(initial: boolean) {
    const [auth, setAuth] = useState(initial);
    return [auth, setAuth] as const;
  }

  useEffect(() => {
    // Automatically trigger on mount
    handleUnlock();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnlock = async () => {
    setIsAuthenticating(true);
    try {
      const verified = await BiometricService.authenticate();
      if (verified) {
        onUnlock();
      } else {
        setIsAuthenticating(false);
      }
    } catch (e) {
      console.error(e);
      toast.error('Face ID / Fingerprint verification failed.');
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    // We clear credentials in the AuthContext logout method
    logout();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999999] bg-[#0A0A0A] flex flex-col items-center justify-center p-6"
    >
      <div className="absolute inset-0 mib-hero-grain opacity-20 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full mx-auto">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 shadow-[0_0_30px_rgba(255,122,0,0.2)] mb-8"
        >
          <img src={logo} alt="Mana Inti Bojanam" className="w-full h-full object-cover" />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <h1 className="text-2xl font-bold text-white mb-2">App Locked</h1>
          <p className="text-white/60 text-sm">
            Mana Inti Bojanam is locked. Verify your identity to continue.
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full space-y-4"
        >
          <button
            onClick={handleUnlock}
            disabled={isAuthenticating}
            className="w-full relative flex items-center justify-center gap-3 bg-brand-primary text-white py-4 px-6 rounded-2xl font-medium active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {isAuthenticating ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Fingerprint className="w-5 h-5" />
                <span>Unlock App</span>
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            disabled={isAuthenticating}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 py-4 px-6 rounded-2xl font-medium active:scale-[0.98] transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Instead</span>
          </button>
        </motion.div>
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-2 text-white/30 text-xs">
        <Lock className="w-3 h-3" />
        <span>Secured locally on your device</span>
      </div>
    </motion.div>
  );
};

export default BiometricLockScreen;
