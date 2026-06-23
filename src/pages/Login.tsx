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
import { m, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, Shield, Fingerprint, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import logo from '../assets/logo.webp';
import { useBiometrics } from '../hooks/useBiometrics';
import BiometricModal from '../components/BiometricModal';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

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
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const { currentUser } = useAuth();
  const { tenantInfo } = useTenant();

  const { 
    isSupported: biometricsSupported, 
    isEnabled: hasLocalBiometrics, 
    authenticate: bioLogin, 
    enroll: bioEnroll,
    biometryType,
    loading: bioLoading,
    refreshStatus
  } = useBiometrics();

  const [showBiometricOnboarding, setShowBiometricOnboarding] = useState(false);

  // Handle redirect result for PWA standalone mode
  React.useEffect(() => {
    // Wake up backend to avoid cold-start delays on Render
    fetch('https://manaintibojanam-backend.onrender.com/api/health').catch(() => {});
    
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        
        if (result?.user) {
          toast.success('Sign-in successful!');
          if (biometricsSupported && !hasLocalBiometrics) {
            setShowBiometricOnboarding(true);
          } else {
            navigate(redirectUrl);
          }
        }
      } catch (error: any) {
        sessionStorage.removeItem('auth_redirecting');
        console.error("Redirect Auth Error:", error);
        
        if (error.code === 'auth/credential-already-in-use') {
          toast.error('This account is already linked to another user.');
        } else if (error.code === 'auth/popup-blocked') {
          toast.error('Please allow popups for this site');
        } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-query-confirmation') {
          toast.error('Sign-in failed. Please try again.');
        }
      }
    };
    handleRedirectResult();
  }, [navigate, redirectUrl]);

  // Auto-redirect if user is already logged in
  React.useEffect(() => {
    if (currentUser && !bioLoading) {
      if (biometricsSupported && !hasLocalBiometrics) {
        setShowBiometricOnboarding(true);
      } else {
        navigate(redirectUrl);
      }
    }
  }, [currentUser, bioLoading, biometricsSupported, hasLocalBiometrics, navigate, redirectUrl]);


  const handleBiometricLogin = async () => {
    const success = await bioLogin();
    if (success) {
      navigate(redirectUrl);
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
          
          let currentSupported = biometricsSupported;
          let currentEnabled = hasLocalBiometrics;
          
          if (bioLoading) {
            const status = await refreshStatus();
            currentSupported = status.supported;
            currentEnabled = status.enabled;
          }

          if (currentSupported && !currentEnabled) {
            setShowBiometricOnboarding(true);
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
      // On native platforms, check if we should show biometric onboarding
      // We check biometricsSupported but also hasLocalBiometrics
      let currentSupported = biometricsSupported;
      let currentEnabled = hasLocalBiometrics;
      
      if (bioLoading) {
        const status = await refreshStatus();
        currentSupported = status.supported;
        currentEnabled = status.enabled;
      }

      if (currentSupported && !currentEnabled) {
        setShowBiometricOnboarding(true);
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
    <div className="h-[100dvh] overflow-y-auto bg-[#fafafa] dark:bg-[#0C0C0C] text-gray-900 dark:text-white flex flex-col justify-between" style={{ backgroundImage: 'radial-gradient(circle at top, rgba(234, 220, 166, 0.03) 0%, transparent 40%)' }}>
      {/* Invisible Recaptcha */}
      <div id="recaptcha-container"></div>

      <div className="flex-1 flex flex-col min-h-min py-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-xs font-bold uppercase tracking-widest bg-gray-200 dark:bg-gray-800 px-5 py-2.5 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Branding & Form Area */}
        <div className="flex-1 px-6 max-w-md w-full mx-auto flex flex-col justify-center py-10">
          <m.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            className="text-center mb-12"
          >
            <div className="inline-block p-1 mb-6">
              {tenantInfo?.logo ? (
                <img src={tenantInfo.logo} alt={`${tenantInfo.name} Logo`} className="w-28 h-28 object-contain rounded-3xl shadow-2xl" loading="eager" />
              ) : (
                <div className="w-28 h-28 bg-gradient-to-br from-[#D35400] to-[#E67E22] rounded-3xl flex items-center justify-center shadow-2xl">
                  <span className="text-4xl font-black text-white tracking-tighter">{tenantInfo?.name ? tenantInfo.name.charAt(0) : 'MI'}</span>
                </div>
              )}
            </div>
            {tenantInfo?.name && (
              <h1 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight">{tenantInfo.name}</h1>
            )}
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Sign in to your account</p>
          </m.div>

          <m.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="bg-white/90 dark:bg-[#111111]/90 backdrop-blur-2xl border border-gray-200 dark:border-white/5 rounded-[2rem] p-8 shadow-2xl"
          >

          {hasLocalBiometrics && (
            <div className="mb-8">
              <button
                onClick={handleBiometricLogin}
                disabled={bioLoading}
                className="w-full bg-gradient-to-r from-[#D35400] to-[#E67E22] hover:opacity-90 text-white rounded-2xl py-4 flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(211,84,0,0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {bioLoading ? (
                  <Loader2 className="animate-spin w-6 h-6" />
                ) : (
                  <>
                    <Fingerprint className="w-6 h-6" />
                    <span className="font-bold text-base tracking-wider uppercase">Use {biometryType || 'Biometrics'}</span>
                  </>
                )}
              </button>
              
              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-gray-200 dark:bg-white/10"></div>
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Or Mobile</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-white/10"></div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <m.form
                key="phone"
                onSubmit={handleSendOtp}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-6"
              >
                <div className="flex items-center bg-gray-100 dark:bg-black/40 border border-transparent dark:border-white/5 rounded-2xl px-6 py-5 focus-within:border-[#D35400] focus-within:ring-4 focus-within:ring-[#D35400]/20 transition-all shadow-inner group">
                  <span className="font-black text-lg text-gray-500 dark:text-gray-400 mr-4 border-r border-gray-300 dark:border-white/10 pr-4">+91</span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Mobile number"
                    className="flex-1 bg-transparent border-none outline-none text-xl font-bold tracking-wider placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-900 dark:text-white"
                    required
                    inputMode="numeric"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || phoneNumber.length !== 10}
                  className="w-full bg-black dark:bg-white text-white dark:text-black rounded-2xl py-5 font-black text-[13px] uppercase tracking-[0.2em] press-feedback disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Continue securely'}
                </button>
              </m.form>
            ) : (
              <m.form
                key="otp"
                onSubmit={handleVerifyOtp}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center mb-2">
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Secure code sent to</p>
                  <p className="text-lg font-black mt-1">+91 {phoneNumber}</p>
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
                  className="w-full bg-black dark:bg-white text-white dark:text-black rounded-2xl py-5 font-black text-[13px] uppercase tracking-[0.2em] press-feedback disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Verify Access Code'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-gray-500 hover:text-black dark:hover:text-white font-bold text-xs uppercase tracking-widest py-2 mt-2 transition-colors"
                >
                  Change Mobile Number
                </button>
              </m.form>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-gray-200 dark:bg-white/10"></div>
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Or Continue With</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-white/10"></div>
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
                title="Admin Login"
              >
                <Shield size={20} />
              </button>
              <button
                onClick={() => navigate('/super-admin/login')}
                className="w-14 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-transparent dark:border-white/5 rounded-[20px] flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                title="Super Admin Login"
              >
                <Crown size={20} />
              </button>
            </div>
          </div>
          </m.div>
        </div>
      </div>

      <div className="p-6 text-center text-xs text-gray-400">
        By continuing, you agree to our Terms of Service <br /> Privacy Policy • Content Policies
      </div>
      
      <BiometricModal 
        isOpen={showBiometricOnboarding} 
        onClose={() => {
          setShowBiometricOnboarding(false);
          navigate(redirectUrl);
        }} 
        onConfirm={async () => {
          const success = await bioEnroll();
          if (success) {
            setShowBiometricOnboarding(false);
            navigate(redirectUrl);
          }
        }}
        type="onboarding"
        biometryType={biometryType}
      />
    </div>
  );
};

export default Login;
