import React, { useState } from 'react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile, sendEmailVerification } from 'firebase/auth';
import { auth } from '../../firebase';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Store, Mail, Lock, Loader2, ArrowRight, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { m } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { getDb } from '../../lib/firebase-db';
import FounderBetaTrustBanner from '../../components/FounderBetaTrustBanner';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
    </g>
  </svg>
);

import ReCAPTCHA from 'react-google-recaptcha';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const OwnerRegister = () => {
  const [name, setName] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = React.useRef<ReCAPTCHA>(null);
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://manaintibojanam-backend.onrender.com';

  // If already logged in, redirect to dashboard
  if (currentUser && (userProfile?.ownedTenantIds?.length || 0) > 0) {
    return <Navigate to="/owner/settings" />;
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name || !restaurantName) return;

    setLoading(true);
    try {
      // Pre-check slug
      const slug = restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const reservedSlugs = ['dominos', 'swiggy', 'zomato', 'kfc', 'mcdonalds', 'burgerking', 'subway', 'admin', 'support', 'api', 'system', 'bhojanos'];
      if (reservedSlugs.some(reserved => slug.startsWith(reserved))) {
        throw new Error("This store name is reserved or unavailable. Please choose another.");
      }

      // Generate fingerprint
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const fingerprint = result.visitorId;

      // Call Backend pre-check
      const checkRes = await fetch(`${API_BASE_URL}/api/register-owner-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fingerprint, recaptchaToken })
      });
      const checkData = await checkRes.json();
      if (!checkRes.ok || !checkData.success) {
        if (recaptchaRef.current) recaptchaRef.current.reset();
        throw new Error(checkData.error || 'Registration blocked by security policy.');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile
      await updateProfile(userCredential.user, { displayName: name });
      
      // Send email verification
      try {
        await sendEmailVerification(userCredential.user);
      } catch (err) {
        console.error("Email verification send failed", err);
      }
      
      // Create user doc
      const db = getDb();
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name,
        email,
        role: 'owner', // Security Patch: Force role to owner instead of admin
        ownedTenantIds: [slug],
        createdAt: new Date()
      }, { merge: true });

      // Create tenant doc
      await setDoc(doc(db, 'tenants', slug), {
        name: restaurantName,
        slug: slug,
        ownerId: userCredential.user.uid,
        status: 'draft',
        storeStatus: 'draft',
        subscription: {
          planId: 'starter',
          status: 'trialing',
          startDate: new Date().toISOString(),
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14-day trial
        },
        legal: {
          status: 'pending'
        },
        fssai: {
          verificationStatus: 'not_submitted',
          registrationDate: new Date().toISOString()
        },
        kyc: {
          ownerName: name,
          email: email,
          emailVerificationStatus: 'pending',
          mobileNumber: mobileNumber,
          mobileVerificationStatus: 'pending',
          verificationLevel: 0
        },
        createdAt: new Date().toISOString(),
        settings: { theme: 'orange' }
      }, { merge: true });

      toast.success('Account created successfully!');
      navigate('/owner/settings');
    } catch (error: any) {
      console.error('Owner Register Error:', error);
      toast.error(error.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      toast.success('Welcome!');
      navigate('/owner/settings');
    } catch (error: any) {
      setLoading(false);
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-query-confirmation') {
        toast.error(error.message || 'Google signup failed');
      }
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] p-4 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center w-full py-8">
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-8 relative overflow-hidden shrink-0"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B00]/5 to-transparent pointer-events-none" />
          
          <div className="flex items-center justify-center gap-2 mb-8 relative z-10">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-[#FF6B00]/20">
              <Store size={20} className="text-white" />
            </div>
            <div className="text-2xl font-black tracking-tight text-white">
              BhojanOS
            </div>
          </div>
          
          <div className="text-center mb-8 relative z-10">
            <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Create your Store</h1>
            <p className="text-white/50 text-sm font-medium mb-6">Start your 14-day free trial today.</p>
            <FounderBetaTrustBanner />
          </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User size={18} className="text-white/20" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Restaurant Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Store size={18} className="text-white/20" />
              </div>
              <input
                type="text"
                required
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="Cloud Kitchen 101"
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={18} className="text-white/20" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.com"
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 flex justify-between">
              <span>Mobile Number</span>
              <span className="text-[10px] text-[#FF6B00]">Required</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone size={18} className="text-white/20" />
              </div>
              <input
                type="tel"
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="9876543210"
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-all font-medium"
              />
            </div>
            <p className="text-[10px] text-white/30 mt-1.5 ml-1">Mobile verification will be enabled in a future update.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={18} className="text-white/20" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-all font-medium"
              />
            </div>
          </div>

          {siteKey && (
            <div className="flex justify-center mt-4">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={siteKey}
                onChange={setRecaptchaToken}
                theme="dark"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#FF6B00]/90 hover:to-orange-400 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl shadow-lg shadow-[#FF6B00]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <span>Start Free Trial</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="h-px bg-white/10 w-full" />
          <span className="text-white/40 text-xs font-bold uppercase tracking-wider">or</span>
          <div className="h-px bg-white/10 w-full" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mt-6 bg-white hover:bg-gray-100 text-gray-900 font-bold text-sm py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:pointer-events-none"
        >
          <GoogleIcon />
          <span>Sign up with Google</span>
        </button>
        
        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-white/40 text-sm">
            Already have an account? <Link to="/owner/login" className="text-[#FF6B00] hover:text-[#FF6B00]/80 font-bold ml-1">Log in</Link>
          </p>
        </div>
      </m.div>
      </div>
    </div>
  );
};

export default OwnerRegister;
