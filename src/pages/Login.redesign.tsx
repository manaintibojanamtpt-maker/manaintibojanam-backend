import React, { useState } from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const Login: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'signup'>('phone');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const navigate = useNavigate();

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Logged in successfully!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
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
    setLoading(true);
    try {
      await confirmationResult?.confirm(otp);
      toast.success('Logged in successfully!');
      navigate('/');
    } catch (error: any) {
      toast.error('Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen max-h-screen max-w-full bg-gradient-to-b from-orange-50 via-white to-white overflow-hidden flex flex-col">
      <div id="recaptcha-container"></div>
      
      {/* PREMIUM BACKGROUND GRADIENTS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 -right-40 w-80 h-80 bg-orange-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-0 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl" />
      </div>

      {/* HERO SECTION */}
      <div className="flex-1 relative flex flex-col items-center justify-center pt-16 pb-6 px-6">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.8, type: "spring", damping: 15 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-40 h-40 bg-white/90 backdrop-blur rounded-[3rem] shadow-2xl flex items-center justify-center p-4 border border-orange-100">
            <img src={logo} alt="Mana Inti Bojanam" className="w-32 h-32 object-contain" />
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-center space-y-3"
          >
            <h1 className="text-5xl font-black text-gray-900 tracking-tight leading-tight">
              Mana Inti<br />Bojanam
            </h1>
            <p className="text-base font-bold text-orange-600 uppercase tracking-widest">
              Fresh Homemade Food
            </p>
            <p className="text-sm text-gray-600 font-medium max-w-sm leading-relaxed mt-2">
              Premium home-cooked meals, delivered fresh. The taste of authentic home cooking, right to your door.
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* LOGIN CARD */}
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, type: "tween" }}
        className="relative z-10 w-full bg-white rounded-t-[2.5rem] px-6 py-8 shadow-2xl border-t border-orange-100"
        style={{
          paddingBottom: `calc(32px + max(env(safe-area-inset-bottom), 16px))`
        }}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Welcome Back</h2>

        <AnimatePresence mode="wait">
          {step === 'phone' && (
            <motion.form 
              key="phone" 
              onSubmit={handleSendOtp} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="premium-card p-4 flex items-center gap-3 border-2 border-orange-200">
                <Phone size={20} className="text-orange-600 flex-shrink-0" />
                <div className="flex items-center gap-1 flex-1">
                  <span className="font-bold text-gray-900">+91</span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter Mobile Number"
                    className="flex-1 bg-transparent outline-none font-semibold text-gray-900 placeholder:text-gray-400"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full btn-orange py-5 text-base"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Continue <ArrowRight size={20} />
                  </>
                )}
              </button>

              <button 
                type="button" 
                onClick={handleGoogleLogin}
                className="w-full py-5 premium-card border-2 border-orange-200 font-bold text-gray-900 rounded-3xl flex items-center justify-center gap-3 hover:bg-orange-50 transition-all active:scale-95"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Continue with Google
              </button>
            </motion.form>
          )}

          {step === 'otp' && (
            <motion.form 
              key="otp" 
              onSubmit={handleVerifyOtp}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full text-4xl font-black text-center tracking-[0.5em] py-5 premium-card border-2 border-orange-200 text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 outline-none"
                  required
                />
                <p className="text-xs text-gray-500 text-center">Check your phone for the 6-digit code</p>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full btn-orange py-5 text-base"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Verify & Login'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <motion.button 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={() => navigate('/admin/login')}
          className="mt-6 w-full text-center py-3 text-sm font-bold text-orange-600 hover:text-orange-700 uppercase tracking-wider transition-colors"
        >
          Admin Login →
        </motion.button>
      </motion.div>
    </div>
  );
};

export default Login;
