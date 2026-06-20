import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, User, Phone, Mail, Lock, MessageCircle, ArrowRight, Loader2, Sparkles, CheckCircle2, ShieldCheck, Headset } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { getDb } from '../lib/firebase-db';
import toast from 'react-hot-toast';
import bhojanOsLogo from '../assets/bhojan-os-logo.png';

const OnboardKitchen = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tenantSlug, setTenantSlug] = useState('');
  
  const [formData, setFormData] = useState({
    kitchenName: '',
    ownerName: '',
    phone: '',
    whatsapp: '',
    email: '',
    password: ''
  });

  const generateSlug = async (name: string) => {
    let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    if (!baseSlug) baseSlug = 'kitchen';
    
    let slug = baseSlug;
    let counter = 1;
    let isUnique = false;
    
    while (!isUnique) {
      const docRef = doc(getDb(), 'tenants', slug);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        isUnique = true;
      } else {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }
    return slug;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // 1. Generate Unique Slug
      const slug = await generateSlug(formData.kitchenName);

      // 2. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 3. Calculate Trial Period (7 days)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      // 4. Create Tenant Document
      await setDoc(doc(getDb(), 'tenants', slug), {
        id: slug,
        slug: slug,
        name: formData.kitchenName,
        createdAt: serverTimestamp(),
        trialEndsAt: trialEndsAt.toISOString(),
        status: 'trialing',
        branding: {
          primaryColor: '#ef4444',
          logoUrl: ''
        },
        contact: {
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          email: formData.email
        }
      });

      // 5. Create Owner Profile
      await setDoc(doc(getDb(), 'users', user.uid), {
        userId: user.uid,
        email: formData.email,
        displayName: formData.ownerName,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        role: 'owner',
        tenantId: slug,
        ownedTenantIds: [slug],
        createdAt: serverTimestamp(),
        preferences: {}
      });

      // 6. Create Sales Pipeline Record
      await setDoc(doc(collection(getDb(), 'salesPipeline')), {
        tenantId: slug,
        kitchenName: formData.kitchenName,
        ownerName: formData.ownerName,
        email: formData.email,
        phone: formData.phone,
        status: 'TRIAL_STARTED',
        source: 'SELF_SERVE',
        createdAt: serverTimestamp(),
        trialEndsAt: trialEndsAt.toISOString()
      });

      setTenantSlug(slug);
      setSuccess(true);
      toast.success('Kitchen created successfully!');
      
      // Allow user to read the success message before redirecting
      setTimeout(() => {
        navigate('/owner/settings');
      }, 3000);

    } catch (error: any) {
      console.error('Onboarding Error:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error("This email is already registered. If you already have an account, please log in. (If you are testing, ensure the user is deleted from Firebase Authentication as well as Firestore).", { duration: 6000 });
      } else if (error.code === 'auth/weak-password') {
        toast.error("Password is too weak. Please use at least 6 characters.");
      } else if (error.code === 'auth/invalid-email') {
        toast.error("Please enter a valid email address.");
      } else {
        toast.error(error.message || 'Failed to create kitchen. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ... (Keep existing states and logic exactly the same)

  if (success) {
    return (
      <div className="min-h-[100dvh] bg-[#fafafa] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2rem] p-8 sm:p-10 max-w-md w-full text-center relative overflow-hidden shadow-xl shadow-gray-200/50 border border-gray-100"
        >
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 relative">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <CheckCircle2 size={48} className="text-green-600" />
            </motion.div>
            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
          </div>
          
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">Store Created!</h2>
          <p className="text-gray-600 mb-8 font-medium leading-relaxed">
            Welcome to BhojanOS. Your 7-day free trial has officially started. Let's get you set up.
          </p>
          
          <div className="bg-gray-50 rounded-2xl p-5 mb-10 border border-gray-200/60">
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">YOUR STORE URL</p>
            <p className="text-gray-900 font-bold text-sm sm:text-base break-all select-all">
              bhojanos.com/k/{tenantSlug}
            </p>
          </div>

          <div className="flex justify-center items-center gap-3">
            <Loader2 className="animate-spin text-gray-400" size={24} />
            <span className="text-sm text-gray-600 font-semibold tracking-wide">Entering Owner Dashboard...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-[#fafafa] dark:bg-[#0c0c0c] flex flex-col font-sans selection:bg-gray-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
      
      {/* Premium Header */}
      <header className="sticky top-0 z-30 pt-[max(env(safe-area-inset-top),0px)] bg-white/90 dark:bg-[#0c0c0c]/90 backdrop-blur-md border-b border-gray-200/80 dark:border-white/10 px-4 py-4 sm:px-8 shadow-sm shadow-gray-100/50 dark:shadow-none">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white shadow-sm ring-1 ring-gray-900/10 overflow-hidden">
              <img src={bhojanOsLogo} alt="BhojanOS Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">BHOJAN<span className="text-red-600">OS</span></h1>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mt-0.5">Partner Onboarding</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-gray-200/80 dark:border-white/10">
            <ShieldCheck size={14} className="text-green-600" aria-hidden="true" /> Secure Setup
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 pb-[140px] sm:pb-32 grid lg:grid-cols-12 gap-8 lg:gap-16">
        
        {/* Left Column: Context & Reinforcement */}
        <div className="lg:col-span-5 flex flex-col space-y-8 lg:sticky lg:top-28 h-fit">
          <div className="text-center sm:text-left mt-2 lg:mt-0">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-[1.15] mb-4">
              Launch your restaurant's direct ordering system <span className="text-red-600">in minutes.</span>
            </h2>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
              Set up your kitchen, connect WhatsApp ordering, and start accepting direct customer orders with zero commissions and no hidden fees.
            </p>
          </div>

          {/* Trust Strip */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 sm:gap-4 border-y border-gray-200/80 dark:border-white/10 py-6">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-800 dark:text-gray-300">
              <CheckCircle2 size={18} className="text-green-600 shrink-0" aria-hidden="true" />
              <span>7-Day Free Trial</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-800 dark:text-gray-300">
              <Sparkles size={18} className="text-blue-600 shrink-0" aria-hidden="true" />
              <span>0% Commission</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-800 dark:text-gray-300">
              <MessageCircle size={18} className="text-green-600 shrink-0" aria-hidden="true" />
              <span>WhatsApp Ready</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-800 dark:text-gray-300">
              <ShieldCheck size={18} className="text-gray-500 shrink-0" aria-hidden="true" />
              <span>Secure Setup</span>
            </div>
          </div>

          {/* Brand/Product Reinforcement */}
          <div className="hidden lg:block bg-white dark:bg-[#151515] rounded-2xl p-6 border border-gray-200/80 dark:border-white/10 shadow-sm">
            <h4 className="text-xs font-extrabold text-gray-500 mb-5 uppercase tracking-widest">What BhojanOS Enables</h4>
            <ul className="space-y-5">
              <li className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0 border border-red-100 dark:border-red-500/20"><Store size={18} className="text-red-600" aria-hidden="true"/></div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Direct Ordering</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">Customers order directly from your custom digital storefront.</p>
                </div>
              </li>
              <li className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-500/20"><User size={18} className="text-blue-600" aria-hidden="true"/></div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Customer Memory</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">Build an owned database of your loyal repeat customers.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Form Flow */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8" noValidate>
            
            {/* Step 1: Store Details */}
            <section className="bg-white dark:bg-[#151515] rounded-[1.5rem] p-6 sm:p-8 shadow-sm border border-gray-200/80 dark:border-white/10">
              <header className="mb-6">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1.5 block">Step 1 of 3</span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Store Details</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Tell us what your customers know your kitchen as.</p>
              </header>
              
              <FormInput 
                id="kitchenName"
                label="Kitchen Name"
                icon={<Store size={20} />}
                type="text"
                value={formData.kitchenName}
                onChange={(e) => setFormData({...formData, kitchenName: e.target.value})}
                placeholder="e.g. Spice Kitchen"
              />
            </section>

            {/* Step 2: Owner Details */}
            <section className="bg-white dark:bg-[#151515] rounded-[1.5rem] p-6 sm:p-8 shadow-sm border border-gray-200/80 dark:border-white/10">
              <header className="mb-6">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1.5 block">Step 2 of 3</span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Owner Information</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Add the owner details used for direct orders and business communication.</p>
              </header>
              
              <div className="space-y-5">
                <FormInput 
                  id="ownerName"
                  label="Full Name"
                  icon={<User size={20} />}
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
                  placeholder="Your legal name"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormInput 
                    id="phone"
                    label="Phone Number"
                    icon={<Phone size={20} />}
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="10 digit mobile"
                  />
                  <FormInput 
                    id="whatsapp"
                    label="WhatsApp Number"
                    icon={<MessageCircle size={20} className="group-focus-within:text-green-600" />}
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    placeholder="For customer orders"
                    helperText="Orders and customer messages can be routed to this number."
                    focusColor="focus:border-green-600 focus:ring-green-600/20"
                  />
                </div>
              </div>
            </section>

            {/* Step 3: Account Security */}
            <section className="bg-white dark:bg-[#151515] rounded-[1.5rem] p-6 sm:p-8 shadow-sm border border-gray-200/80 dark:border-white/10">
              <header className="mb-6">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1.5 block">Step 3 of 3</span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Account Setup</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Create your login to access and manage your BhojanOS dashboard.</p>
              </header>
              
              <div className="space-y-5">
                <FormInput 
                  id="email"
                  label="Email Address"
                  icon={<Mail size={20} />}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="name@restaurant.com"
                />

                <FormInput 
                  id="password"
                  label="Password"
                  icon={<Lock size={20} />}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Min. 6 characters"
                />
              </div>
            </section>

            {/* Support Block */}
            <div className="bg-gray-100/50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-[1.5rem] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5 flex-col sm:flex-row text-center sm:text-left">
                <div className="w-14 h-14 bg-white dark:bg-[#222222] rounded-2xl shadow-sm border border-gray-200/80 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
                  <Headset size={26} aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">Need help setting up your kitchen?</h4>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 max-w-sm leading-relaxed">Our team can help you configure your account and get your kitchen ready to start taking direct orders.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 text-sm font-semibold w-full sm:w-auto shrink-0">
                <a href="tel:7666258454" className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-3 bg-white dark:bg-[#222222] px-5 py-3.5 rounded-xl text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#333333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-white transition-all shadow-sm border border-gray-200/80 dark:border-white/10">
                  <Phone size={18} className="text-gray-400" aria-hidden="true" />
                  7666258454
                </a>
                <a href="mailto:bhojanos26@gmail.com" className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-3 bg-white dark:bg-[#222222] px-5 py-3.5 rounded-xl text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#333333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-white transition-all shadow-sm border border-gray-200/80 dark:border-white/10">
                  <Mail size={18} className="text-gray-400" aria-hidden="true" />
                  bhojanos26@gmail.com
                </a>
              </div>
            </div>

            {/* Sticky Mobile CTA & Desktop CTA */}
            <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(env(safe-area-inset-bottom),1rem)] sm:pb-0 sm:p-0 sm:relative sm:bg-transparent bg-white/95 dark:bg-[#0c0c0c]/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-white/10 sm:border-0 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] sm:shadow-none">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-200 text-white dark:text-black font-bold uppercase tracking-wider text-[13px] py-4 sm:py-4.5 rounded-xl shadow-lg shadow-gray-900/15 dark:shadow-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/30 dark:focus-visible:ring-white/30 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                    <span>Creating Store...</span>
                  </>
                ) : (
                  <>
                    <span>Start 7-Day Free Trial</span>
                    <ArrowRight size={20} aria-hidden="true" />
                  </>
                )}
              </button>
              <p className="hidden sm:block text-center text-[11px] font-bold text-gray-400 mt-4 uppercase tracking-widest">
                By starting your trial, you agree to our Terms of Service
              </p>
            </div>
            
            {/* Form Footer Links (Scrollable) */}
            <div className="mt-8 flex flex-col items-center gap-3 border-t border-gray-100 dark:border-white/10 pt-6">
              <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Already have an account?</p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/owner/login')}
                  className="flex items-center gap-2 text-[13px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 px-5 py-2.5 rounded-full transition-colors active:scale-95"
                >
                  <Store size={16} />
                  Owner Login
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/super-admin/login')}
                  className="flex items-center gap-2 text-[13px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 px-5 py-2.5 rounded-full transition-colors active:scale-95"
                >
                  <ShieldCheck size={16} />
                  Super Admin
                </button>
              </div>
            </div>

            {/* Explicit Spacer for Mobile Sticky CTA */}
            <div className="h-[250px] sm:h-4 w-full shrink-0"></div>
            
          </form>
        </div>
      </main>
    </div>
  );
};

// Extracted Premium Input Component for consistency and accessibility
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon: React.ReactNode;
  helperText?: string;
  focusColor?: string;
}

const FormInput: React.FC<FormInputProps> = ({ 
  id, 
  label, 
  icon, 
  helperText, 
  focusColor = "focus:border-gray-900 focus:ring-gray-900/20 dark:focus:border-white dark:focus:ring-white/20",
  ...props 
}) => {
  return (
    <div>
      <label htmlFor={id} className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 block ml-1">
        {label}
      </label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-gray-900 dark:group-focus-within:text-white transition-colors">
          {icon}
        </div>
        <input
          id={id}
          required
          aria-describedby={helperText ? `${id}-help` : undefined}
          className={`w-full bg-white dark:bg-[#222222] border border-gray-300 dark:border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-gray-900 dark:text-white text-sm font-semibold placeholder:text-gray-400 placeholder:font-medium focus:outline-none focus:ring-4 transition-all shadow-sm ${focusColor}`}
          {...props}
        />
      </div>
      {helperText && (
        <p id={`${id}-help`} className="text-[11px] font-medium text-gray-500 mt-2 ml-1 leading-snug">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default OnboardKitchen;
