import React, { useState } from 'react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile, sendEmailVerification } from 'firebase/auth';
import { auth } from '../../firebase';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Store, Mail, Lock, Loader2, ArrowRight, ArrowLeft, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { m } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getDb } from '../../lib/firebase-db';
import FounderBetaTrustBanner from '../../components/FounderBetaTrustBanner';
import { EnvironmentConfig } from '../../config/environment';
import { onboardingPlanMessaging } from '../../config/pricing';
import PlanClarityNotice from '../../components/owner/PlanClarityNotice';
import SoftButton from '../../components/ui/SoftButton';

const RESERVED_SLUGS = ['dominos', 'swiggy', 'zomato', 'kfc', 'mcdonalds', 'burgerking', 'subway', 'admin', 'support', 'api', 'system', 'bhojanos'];

const slugFromRestaurantName = (restaurantName: string) =>
  restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

const provisionOwnerTenant = async (
  uid: string,
  params: { name: string; email: string; restaurantName: string; mobileNumber?: string }
): Promise<string> => {
  const slug = slugFromRestaurantName(params.restaurantName);
  if (!slug) throw new Error('Please enter a valid restaurant name.');
  if (RESERVED_SLUGS.some((reserved) => slug.startsWith(reserved))) {
    throw new Error('This store name is reserved or unavailable. Please choose another.');
  }

  const db = getDb();
  const userRef = doc(db, 'users', uid);
  const existingUser = await getDoc(userRef);
  if (existingUser.exists() && (existingUser.data()?.ownedTenantIds?.length ?? 0) > 0) {
    return existingUser.data()!.ownedTenantIds[0];
  }

  const tenantRef = doc(db, 'tenants', slug);
  const existingTenant = await getDoc(tenantRef);
  if (existingTenant.exists() && existingTenant.data()?.ownerId !== uid) {
    throw new Error('This store name is already taken. Please choose another.');
  }

  await setDoc(userRef, {
    name: params.name,
    email: params.email,
    role: 'owner',
    ownedTenantIds: [slug],
    updatedAt: new Date(),
    ...(existingUser.exists() ? {} : { createdAt: new Date() }),
  }, { merge: true });

  await setDoc(tenantRef, {
    name: params.restaurantName,
    slug,
    ownerId: uid,
    status: 'draft',
    storeStatus: 'draft',
    subscription: {
      planId: 'starter',
      status: 'active',
      startDate: new Date().toISOString(),
      trialUsed: false,
    },
    legal: { status: 'pending' },
    fssai: {
      verificationStatus: 'not_submitted',
      registrationDate: new Date().toISOString(),
    },
    kyc: {
      ownerName: params.name,
      email: params.email,
      emailVerificationStatus: 'pending',
      mobileNumber: params.mobileNumber || '',
      mobileVerificationStatus: 'pending',
      verificationLevel: 0,
    },
    onboardingStatus: {
      isComplete: false,
      currentStep: 1,
      migrated: false,
    },
    paymentConfig: {
      defaultProvider: 'cod',
      providers: {
        cod: { enabled: true },
        razorpay: { enabled: false },
      },
    },
    pricingConfig: {
      gstPercent: 0,
      packingFee: 0,
    },
    deliveryConfig: {
      enabled: true,
      freeRadius: 2,
      paidRadius: 5,
      maxRadius: 10,
      baseFee: 0,
      perKmCharge: 0,
      prepTime: 20,
      feesConfigured: false,
    },
    createdAt: new Date().toISOString(),
    settings: { theme: 'orange' },
  }, { merge: true });

  return slug;
};

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
  const API_BASE_URL = EnvironmentConfig.getApiUrl();

  // If already logged in, redirect to dashboard
  if (currentUser && (userProfile?.ownedTenantIds?.length || 0) > 0) {
    return <Navigate to="/owner/dashboard" />;
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name || !restaurantName) return;

    setLoading(true);
    try {
      // Pre-check slug
      const slug = slugFromRestaurantName(restaurantName);
      if (RESERVED_SLUGS.some(reserved => slug.startsWith(reserved))) {
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
      
      await provisionOwnerTenant(userCredential.user.uid, {
        name,
        email,
        restaurantName,
        mobileNumber,
      });

      toast.success('Account created successfully!');
      navigate('/owner/setup');
    } catch (error: any) {
      console.error('Owner Register Error:', error);
      toast.error(error.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    if (!restaurantName.trim()) {
      toast.error('Enter your restaurant name above, then continue with Google.');
      return;
    }
    if (!name.trim()) {
      toast.error('Enter your full name above, then continue with Google.');
      return;
    }

    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await provisionOwnerTenant(user.uid, {
        name: name.trim() || user.displayName || 'Owner',
        email: user.email || email,
        restaurantName: restaurantName.trim(),
        mobileNumber,
      });

      toast.success('Welcome!');
      navigate('/owner/setup');
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        toast.error(error.message || 'Google signup failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-[#0a0a0a] px-4 py-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center">
        <Link
          to={EnvironmentConfig.getMarketingHomePath()}
          className="inline-flex items-center gap-2 text-white/40 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors mb-4 self-start"
        >
          <ArrowLeft size={14} /> Back to BhojanOS
        </Link>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-[#111] border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden shrink-0"
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
          
          <div className="text-center mb-6 relative z-10">
            <h1 className="text-2xl font-black text-white mb-2 tracking-tight">{onboardingPlanMessaging.registerTitle}</h1>
            <p className="text-white/50 text-sm font-medium">{onboardingPlanMessaging.registerSubtitle}</p>
          </div>

          <div className="relative z-10 mb-6">
            <PlanClarityNotice variant="register" />
          </div>

          <div className="relative z-10 mb-6">
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

          <SoftButton type="submit" tone="primary" fullWidth disabled={loading} className="mt-4">
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <span>{onboardingPlanMessaging.registerButton}</span>
                <ArrowRight size={18} />
              </>
            )}
          </SoftButton>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="h-px bg-white/10 w-full" />
          <span className="text-white/40 text-xs font-bold uppercase tracking-wider">or</span>
          <div className="h-px bg-white/10 w-full" />
        </div>

        <SoftButton
          type="button"
          tone="secondary"
          fullWidth
          disabled={loading}
          onClick={handleGoogleLogin}
          className="mt-6"
        >
          <GoogleIcon />
          <span>Sign up with Google</span>
        </SoftButton>
        
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
