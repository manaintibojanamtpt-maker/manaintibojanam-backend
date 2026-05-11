import React, { useState } from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, Shield, Fingerprint } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import logo from '../assets/logo.webp';
import BiometricPrompt from '../components/BiometricPrompt';
import { isBiometricSupported, loginWithBiometric, hasBiometricsEnabledLocally } from '../services/biometrics';

const AppleIcon = () => (
  <svg viewBox="0 0 384 512" width="20" height="20" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
  </svg>
);

const Login: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [hasLocalBiometrics, setHasLocalBiometrics] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  // Handle redirect result for PWA standalone mode
  React.useEffect(() => {
    const handleRedirectResult = async () => {
      // Check if we just returned from a redirect
      const hasRedirected = sessionStorage.getItem('auth_redirecting') === 'true';
      if (!hasRedirected) return;

      const toastId = toast.loading('Completing sign-in...');
      try {
        const result = await getRedirectResult(auth);
        sessionStorage.removeItem('auth_redirecting');
        
        if (result?.user) {
          toast.success('Sign-in successful!', { id: toastId });
          if (await isBiometricSupported() && !hasBiometricsEnabledLocally()) {
            setShowBiometricPrompt(true);
          } else {
            navigate(redirectUrl);
          }
        } else {
          // No user, but no error - just clear the toast
          toast.dismiss(toastId);
        }
      } catch (error: any) {
        sessionStorage.removeItem('auth_redirecting');
        console.error("Redirect Auth Error:", error);
        
        if (error.code === 'auth/credential-already-in-use') {
          toast.error('This account is already linked to another user.', { id: toastId });
        } else if (error.code === 'auth/popup-blocked') {
          toast.error('Please allow popups for this site', { id: toastId });
        } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-query-confirmation') {
          toast.error('Sign-in failed. Please try again.', { id: toastId });
        } else {
          toast.dismiss(toastId);
        }
      }
    };
    handleRedirectResult();
  }, [navigate, redirectUrl]);

  React.useEffect(() => {
    isBiometricSupported().then(supported => {
      setBiometricsSupported(supported);
      setHasLocalBiometrics(hasBiometricsEnabledLocally());
    });
  }, []);

  const handleBiometricLogin = async () => {
    if (biometricLoading) return;
    setBiometricLoading(true);
    try {
      const success = await loginWithBiometric();
      if (success) {
        toast.success('Logged in successfully!');
        navigate(redirectUrl);
      }
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        toast.error('Face ID / Fingerprint failed. Please login manually.');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    
    // Check if app is in standalone mode (Added to Home Screen)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Force "select_account" to ensure user always gets the choice
      provider.setCustomParameters({ prompt: 'select_account' });

      if (isStandalone) {
        // Popups fail in standalone mode on many mobile browsers
        sessionStorage.setItem('auth_redirecting', 'true');
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        if (result.user) {
          toast.success('Sign-in successful!');
          if (biometricsSupported && !hasLocalBiometrics) {
            setShowBiometricPrompt(true);
          } else {
            setTimeout(() => navigate(redirectUrl), 500);
          }
        }
      }
    } catch (error: any) {
      setLoading(false); // Reset loading on error
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-query-confirmation') {
        toast.error(error.message || 'Google login failed');
      }
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit number');
      return;
    }
    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const formattedPhone = `+91${phoneNumber}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setStep('otp');
      toast.success('OTP sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      await confirmationResult?.confirm(otp);
      toast.success('Logged in successfully!');
      if (biometricsSupported && !hasLocalBiometrics) {
        setShowBiometricPrompt(true);
      } else {
        navigate(redirectUrl);
      }
    } catch (error: any) {
      toast.error('Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0C0C0C] text-gray-900 dark:text-white flex flex-col justify-between" style={{ backgroundImage: 'radial-gradient(circle at top, rgba(234, 220, 166, 0.03) 0%, transparent 40%)' }}>
      {/* Invisible Recaptcha */}
      <div id="recaptcha-container"></div>

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 mb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-3xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-sm font-bold bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-3xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Branding & Form Area */}
        <div className="flex-1 px-6 max-w-md w-full mx-auto flex flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            className="text-center mb-10"
          >
            <div className="inline-block p-1 mb-6">
              <img src="/logo-v20-final.png" alt="Mana Inti Bojanam Emblem" className="w-24 h-24 object-contain rounded-2xl shadow-xl" loading="eager" />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="bg-white/80 dark:bg-[#141414]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-3xl p-6 shadow-2xl"
          >

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200 dark:bg-white/5"></div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Sign In</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-white/5"></div>
          </div>

          {hasLocalBiometrics && (
            <div className="mb-6">
              <button
                onClick={handleBiometricLogin}
                disabled={biometricLoading}
                className="w-full bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c] hover:opacity-90 text-white rounded-[20px] py-4 flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(255,107,53,0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {biometricLoading ? (
                  <Loader2 className="animate-spin w-6 h-6" />
                ) : (
                  <>
                    <Fingerprint className="w-6 h-6" />
                    <span className="font-bold text-base tracking-wide">Login with Face ID</span>
                  </>
                )}
              </button>
              
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-gray-200 dark:bg-white/5"></div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Or Use Phone</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-white/5"></div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.form
                key="phone"
                onSubmit={handleSendOtp}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center bg-gray-100 dark:bg-black/50 border border-transparent dark:border-white/5 rounded-[20px] px-5 py-4 focus-within:border-[#D35400] focus-within:ring-2 focus-within:ring-[#D35400]/20 transition-all shadow-inner group">
                  <span className="font-bold text-sm text-gray-500 dark:text-gray-400 mr-3 border-r border-gray-300 dark:border-white/10 pr-3">+91</span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Mobile number"
                    className="flex-1 bg-transparent border-none outline-none text-base font-medium placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-900 dark:text-white"
                    required
                    inputMode="numeric"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || phoneNumber.length !== 10}
                  className="w-full bg-[#D35400] hover:bg-[#A04000] text-white rounded-[20px] py-4 font-bold text-sm tracking-wider press-feedback disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#D35400]/20"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Continue'}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="otp"
                onSubmit={handleVerifyOtp}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-4"
              >
                <div className="text-center mb-2">
                  <p className="text-sm text-gray-500">OTP sent to +91 {phoneNumber}</p>
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full text-center bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 rounded-3xl py-4 text-2xl font-black tracking-[0.5em] outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all shadow-inner text-gray-900 dark:text-white"
                  required
                  inputMode="numeric"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-[#D35400] hover:bg-[#A04000] text-white rounded-[20px] py-4 font-bold text-sm tracking-wider press-feedback disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#D35400]/20"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Verify OTP'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-gray-500 font-bold py-2 mt-2"
                >
                  Change Mobile Number
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200 dark:bg-white/5"></div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-white/5"></div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-white dark:bg-[#222222] border border-gray-200 dark:border-white/10 rounded-[20px] py-3.5 flex items-center justify-center gap-3 shadow-sm hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Continue with Google</span>
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={() => toast.error('Apple Login Coming Soon')}
                className="flex-1 bg-black dark:bg-white text-white dark:text-black rounded-[20px] py-3.5 flex items-center justify-center gap-2 hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors"
              >
                <AppleIcon />
                <span className="font-semibold text-sm">Apple</span>
              </button>
              <button
                onClick={() => navigate('/admin/login')}
                className="w-14 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-transparent dark:border-white/5 rounded-[20px] flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                <Shield size={20} />
              </button>
            </div>
          </div>
          </motion.div>
        </div>
      </div>

      <div className="p-6 text-center text-xs text-gray-400">
        By continuing, you agree to our Terms of Service <br /> Privacy Policy • Content Policies
      </div>
      
      <BiometricPrompt 
        isOpen={showBiometricPrompt} 
        onClose={() => {
          setShowBiometricPrompt(false);
          navigate(redirectUrl);
        }} 
      />
    </div>
  );
};

export default Login;
