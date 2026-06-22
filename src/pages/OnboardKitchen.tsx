import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Store, User, Phone, Mail, Lock, MessageCircle, ArrowRight, Loader2, 
  Sparkles, CheckCircle2, ShieldCheck, Headset, Users, ShoppingBag, 
  ChevronRight, Building2, Zap, Activity, PieChart, 
  Globe, Database, BarChart3, LineChart, TrendingUp, LockKeyhole
} from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { getDb } from '../lib/firebase-db';
import toast from 'react-hot-toast';
import bhojanOsLogo from '../assets/bhojan-os-logo.png';

// --- Premium UI Components ---

const springTransition = { type: "spring", stiffness: 120, damping: 20 };

const AmbientOrbs = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -150]);
  const y3 = useTransform(scrollY, [0, 1000], [0, 100]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#050505]">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none" />
      <motion.div style={{ y: y1 }} className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#FF6B00] blur-[160px] opacity-20 mix-blend-screen" />
      <motion.div style={{ y: y2 }} className="absolute top-[30%] left-[-10%] w-[700px] h-[700px] rounded-full bg-[#A855F7] blur-[160px] opacity-15 mix-blend-screen" />
      <motion.div style={{ y: y3 }} className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-[#FF4D8D] blur-[160px] opacity-15 mix-blend-screen" />
    </div>
  );
};

const GlassCard = ({ children, className = '', onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <motion.div 
    onClick={onClick}
    whileHover={onClick ? { scale: 1.02, y: -5 } : {}}
    transition={springTransition}
    className={`bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${onClick ? 'cursor-pointer hover:bg-white/[0.06] hover:border-white/20 hover:shadow-[0_20px_80px_rgba(255,107,0,0.15)]' : ''} ${className}`}
  >
    {children}
  </motion.div>
);

const GradientText = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <span className={`bg-gradient-to-r from-[#FF6B00] via-[#FF4D8D] to-[#A855F7] bg-clip-text text-transparent animate-gradient-shine bg-[length:200%_auto] ${className}`}>
    {children}
  </span>
);

const GradientButton = ({ children, onClick, type = 'button', disabled = false, className = '' }: any) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`relative group overflow-hidden w-full bg-white text-black hover:bg-gray-100 transition-all duration-300 font-bold text-lg py-4 rounded-xl shadow-[0_0_40px_rgba(255,255,255,0.1)] disabled:opacity-70 flex items-center justify-center gap-2 ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B00]/10 via-[#FF4D8D]/10 to-[#A855F7]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <span className="relative z-10 flex items-center gap-2">{children}</span>
  </button>
);

const OutlineButton = ({ children, onClick, className = '' }: any) => (
  <button
    onClick={onClick}
    className={`w-full bg-white/5 hover:bg-white/10 border border-white/20 transition-all duration-300 text-white font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 ${className}`}
  >
    {children}
  </button>
);

const ProgressBar = ({ step }: { step: 'services' | 'register' | 'success' }) => {
  const steps = ['services', 'register', 'success'];
  const currentIndex = steps.indexOf(step);
  const progress = Math.max(10, (currentIndex / (steps.length - 1)) * 100);

  return (
    <div className="w-full max-w-sm mx-auto mb-10">
      <div className="flex justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
        <span>{step === 'services' ? 'Model' : step === 'register' ? 'Account' : 'Done'}</span>
        <span>{Math.round(progress)}% Complete</span>
      </div>
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-[#FF6B00] via-[#FF4D8D] to-[#A855F7]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
};

// --- Form Input ---

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string; label: string; icon?: React.ReactNode;
}
const FormInput: React.FC<FormInputProps> = ({ id, label, icon, ...props }) => (
  <div>
    <label htmlFor={id} className="text-[13px] font-bold text-gray-300 mb-2 block">{label}</label>
    <div className="relative group">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-[#FF6B00] transition-colors">
          {icon}
        </div>
      )}
      <input 
        id={id} 
        required 
        className={`w-full bg-white/5 border border-white/10 focus:border-[#FF6B00] focus:ring-4 focus:ring-[#FF6B00]/20 rounded-xl py-3.5 ${icon ? 'pl-11' : 'px-4'} pr-4 text-white text-base font-semibold placeholder:text-gray-600 outline-none transition-all`} 
        {...props} 
      />
    </div>
  </div>
);

// --- Sections ---

const DashboardMockup = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 40, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: 0.2, ...springTransition }}
      className="relative w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(255,107,0,0.15)] bg-[#111111] perspective-1000 mt-16 lg:mt-0"
    >
      <div className="h-10 bg-black/50 border-b border-white/10 flex items-center px-4 gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
        <div className="mx-auto px-6 py-1 rounded-md bg-white/5 text-[10px] font-mono text-gray-400">bhojanos.com/owner</div>
      </div>
      <div className="p-6 grid grid-cols-3 gap-4">
        {/* Sidebar Mock */}
        <div className="col-span-1 space-y-3 hidden sm:block">
          <div className="h-8 w-24 bg-white/10 rounded-md mb-8" />
          {[1,2,3,4,5].map(i => <div key={i} className="h-6 w-full bg-white/5 rounded-md" />)}
        </div>
        {/* Main Content Mock */}
        <div className="col-span-3 sm:col-span-2 space-y-4">
          <div className="flex justify-between items-end mb-6">
            <div>
              <div className="text-2xl font-bold text-white mb-1">₹1,24,500</div>
              <div className="text-xs text-green-400 flex items-center gap-1"><TrendingUp size={12}/> +14.2% Today</div>
            </div>
            <div className="h-8 w-32 bg-gradient-to-r from-[#FF6B00] to-[#FF4D8D] rounded-full opacity-80" />
          </div>
          <div className="h-48 w-full bg-white/5 border border-white/10 rounded-xl relative overflow-hidden flex items-end p-4 gap-2">
            {[40, 60, 45, 80, 55, 90, 75].map((h, i) => (
              <motion.div 
                key={i} 
                initial={{ height: 0 }} 
                animate={{ height: `${h}%` }} 
                transition={{ delay: 0.5 + (i * 0.1), ...springTransition }}
                className="flex-1 bg-gradient-to-t from-[#A855F7]/80 to-[#FF4D8D]/80 rounded-t-sm" 
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="h-24 bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                <div className="text-xs text-gray-400">Active Orders</div>
                <div className="text-xl font-bold text-white">42</div>
             </div>
             <div className="h-24 bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                <div className="text-xs text-gray-400">AI Inventory Alert</div>
                <div className="text-sm font-bold text-[#FF6B00]">Low Tomato Stock</div>
             </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-transparent pointer-events-none" />
    </motion.div>
  );
}

// --- Main Component ---

const OnboardKitchen = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'landing' | 'services' | 'register' | 'success'>('landing');
  const [loading, setLoading] = useState(false);
  const [tenantSlug, setTenantSlug] = useState('');
  
  const [formData, setFormData] = useState({
    kitchenName: '', ownerName: '', phone: '', whatsapp: '', email: '', password: '', serviceType: ''
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const generateSlug = async (name: string) => {
    let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    if (!baseSlug) baseSlug = 'kitchen';
    let slug = baseSlug, counter = 1, isUnique = false;
    while (!isUnique) {
      const docRef = doc(getDb(), 'tenants', slug);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) isUnique = true;
      else { slug = `${baseSlug}-${counter}`; counter++; }
    }
    return slug;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const slug = await generateSlug(formData.kitchenName);
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      const trialEndsAt = new Date(); trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      await setDoc(doc(getDb(), 'tenants', slug), {
        id: slug, slug, name: formData.kitchenName, createdAt: serverTimestamp(), trialEndsAt: trialEndsAt.toISOString(), status: 'trialing',
        branding: { primaryColor: '#FF6B00', logoUrl: '' },
        contact: { phone: formData.phone, whatsapp: formData.whatsapp, email: formData.email },
        serviceType: formData.serviceType
      });

      await setDoc(doc(getDb(), 'users', user.uid), {
        userId: user.uid, email: formData.email, displayName: formData.ownerName, phone: formData.phone, whatsapp: formData.whatsapp, role: 'owner',
        tenantId: slug, ownedTenantIds: [slug], createdAt: serverTimestamp(), preferences: {}
      });

      await setDoc(doc(collection(getDb(), 'salesPipeline')), {
        tenantId: slug, kitchenName: formData.kitchenName, ownerName: formData.ownerName, email: formData.email, phone: formData.phone,
        serviceType: formData.serviceType, status: 'TRIAL_STARTED', source: 'SELF_SERVE', createdAt: serverTimestamp(), trialEndsAt: trialEndsAt.toISOString()
      });

      setTenantSlug(slug);
      setStep('success');
      toast.success('Kitchen created successfully!');
      setTimeout(() => navigate('/owner/settings'), 3000);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') toast.error("This email is already registered. Please log in.");
      else if (error.code === 'auth/weak-password') toast.error("Password is too weak. Please use at least 6 characters.");
      else if (error.code === 'auth/invalid-email') toast.error("Please enter a valid email address.");
      else toast.error(error.message || 'Failed to create kitchen. Please try again.');
    } finally { setLoading(false); }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <AmbientOrbs />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={springTransition} className="relative z-10 w-full max-w-md">
          <GlassCard className="p-8 sm:p-10 text-center">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10 relative">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, ...springTransition }}>
                <CheckCircle2 size={48} className="text-[#FF6B00]" />
              </motion.div>
            </div>
            <h2 className="text-3xl font-extrabold mb-4 tracking-tight"><GradientText>OS Provisioned</GradientText></h2>
            <p className="text-gray-400 mb-8 font-medium leading-relaxed">Your AI Operations Center is ready.</p>
            <div className="bg-[#111111] rounded-2xl p-5 mb-10 border border-white/10">
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">STORE ENDPOINT</p>
              <p className="text-[#FF6B00] font-bold text-sm sm:text-base break-all select-all">bhojanos.com/k/{tenantSlug}</p>
            </div>
            <div className="flex justify-center items-center gap-3">
              <Loader2 className="animate-spin text-[#FF6B00]" size={24} />
              <span className="text-sm text-gray-400 font-semibold tracking-wide">Initializing Dashboards...</span>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  // Auth/Setup Flow Overlay
  if (step === 'services' || step === 'register') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-4 relative overflow-hidden font-sans pt-20">
        <AmbientOrbs />
        <div className="relative z-10 w-full max-w-2xl">
          <button onClick={() => setStep(step === 'register' ? 'services' : 'landing')} className="mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-bold">
             <ChevronLeft size={16} /> Back
          </button>
          
          <ProgressBar step={step} />

          <AnimatePresence mode="wait">
            {step === 'services' && (
              <motion.div key="services" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springTransition}>
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-black mb-4 text-white">Select Your Operating Model</h2>
                  <p className="text-gray-400 font-medium">Choose how BhojanOS should configure your AI algorithms.</p>
                </div>
                <div className="space-y-4">
                  {[
                    { id: 'both', title: 'Delivery & Dining', desc: 'Hybrid intelligence for full-scale restaurants.', icon: <Building2 className="text-[#FF6B00]" size={28} /> },
                    { id: 'delivery', title: 'Cloud Kitchen (Delivery Only)', desc: 'Optimized purely for speed, tracking, and aggregators.', icon: <Activity className="text-[#FF4D8D]" size={28} /> },
                    { id: 'dining', title: 'Dining Only', desc: 'QR menus and table-level customer intelligence.', icon: <Store className="text-[#A855F7]" size={28} /> }
                  ].map((s) => (
                    <GlassCard 
                      key={s.id} 
                      onClick={() => { setFormData({...formData, serviceType: s.id}); setStep('register'); }}
                      className={`p-6 relative group ${formData.serviceType === s.id ? 'border-[#FF6B00]/50 bg-[#FF6B00]/10 shadow-[0_0_30px_rgba(255,107,0,0.15)]' : ''}`}
                    >
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                            {s.icon}
                         </div>
                         <div>
                            <h3 className="text-xl font-bold text-white mb-1">{s.title}</h3>
                            <p className="text-gray-400 text-sm font-medium">{s.desc}</p>
                         </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'register' && (
              <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springTransition}>
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-black mb-3 text-white">Initialize Tenant</h2>
                  <p className="text-gray-400 font-medium">Provisioning secure enterprise environment.</p>
                </div>

                <GlassCard className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <FormInput id="kitchenName" label="Registered Business Name" icon={<Store size={18} />} type="text" value={formData.kitchenName} onChange={(e) => setFormData({...formData, kitchenName: e.target.value})} placeholder="e.g. Spice Kitchen" />
                    <FormInput id="ownerName" label="Director / Owner Name" icon={<User size={18} />} type="text" value={formData.ownerName} onChange={(e) => setFormData({...formData, ownerName: e.target.value})} placeholder="Legal name" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormInput id="phone" label="Primary Phone" icon={<Phone size={18} />} type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="10 digit mobile" />
                      <FormInput id="whatsapp" label="WhatsApp Number" icon={<MessageCircle size={18} />} type="tel" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} placeholder="For automated alerts" />
                    </div>
                    <div className="pt-6 border-t border-white/10 mt-6">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Root Access Credentials</p>
                      <div className="space-y-6">
                        <FormInput id="email" label="Admin Email" icon={<Mail size={18} />} type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="admin@restaurant.com" />
                        <FormInput id="password" label="Master Password" icon={<LockKeyhole size={18} />} type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="Min. 6 characters" />
                      </div>
                    </div>
                    <div className="pt-6">
                      <GradientButton type="submit" disabled={loading}>
                        {loading ? <><Loader2 className="animate-spin" size={20}/> Creating Workspace...</> : 'Launch Free Trial'}
                      </GradientButton>
                    </div>
                  </form>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // --- Landing Page ---
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#FF6B00]/30 relative">
      <AmbientOrbs />
      
      {/* Sticky Glass Navbar */}
      <header className="sticky top-0 z-50 bg-[#050505]/60 backdrop-blur-2xl border-b border-white/10 transition-all duration-300">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between w-full">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({top:0, behavior: 'smooth'})}>
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-sm ring-1 ring-white/10 overflow-hidden">
              <img src={bhojanOsLogo} alt="BhojanOS Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter leading-none text-white">
                Bhojan<GradientText>OS</GradientText>
              </h1>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-300">
            <a href="#features" className="hover:text-white transition-colors">Platform</a>
            <a href="#dashboard" className="hover:text-white transition-colors">Dashboard</a>
            <a href="#story" className="hover:text-white transition-colors">Story</a>
            <a href="#enterprise" className="hover:text-white transition-colors">Enterprise</a>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/owner/login')} className="hidden sm:flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-white transition-colors">
               Log in
            </button>
            <button onClick={() => setStep('services')} className="bg-white text-black hover:bg-gray-200 transition-colors px-5 py-2.5 rounded-full text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)]">
               Start Trial
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 overflow-x-hidden">
        
        {/* Hero Section */}
        <section className="pt-24 pb-32 px-6 lg:px-12 max-w-[1400px] mx-auto min-h-[90vh] flex items-center">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={springTransition} className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest mb-8 text-[#FF6B00] shadow-[0_0_20px_rgba(255,107,0,0.1)]">
                <Sparkles size={14} /> The AI Operating System
              </div>
              <h1 className="text-6xl md:text-7xl lg:text-[5.5rem] font-black tracking-tighter mb-8 leading-[1.05]">
                Launch With <br/> Bhojan<GradientText>OS AI</GradientText>
              </h1>
              <div className="text-xl sm:text-2xl text-gray-400 font-medium leading-relaxed mb-10 space-y-2">
                <p className="text-white font-bold">Own Your Customers.</p>
                <p>Predict Demand. Automate Operations. Scale With AI.</p>
                <p className="text-lg">Everything your food business needs in one intelligent platform.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 max-w-md">
                <GradientButton onClick={() => setStep('services')}>
                  Start Free Trial <ChevronRight size={18} />
                </GradientButton>
                <OutlineButton onClick={() => document.getElementById('dashboard')?.scrollIntoView({behavior:'smooth'})}>
                  Explore The OS
                </OutlineButton>
              </div>
            </motion.div>
            
            {/* Right */}
            <DashboardMockup />
          </div>
        </section>

        {/* Trust Metrics */}
        <section className="border-y border-white/5 bg-[#111111]/50 backdrop-blur-xl py-10 overflow-hidden">
          <div className="max-w-[1400px] mx-auto px-6 flex flex-wrap justify-between items-center gap-8 md:gap-4 opacity-80">
             <div className="flex flex-col items-center sm:items-start">
               <span className="text-3xl font-black text-white">10,000+</span>
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Businesses Ready To Scale</span>
             </div>
             <div className="flex flex-col items-center sm:items-start">
               <span className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="text-[#FF6B00]" size={20}/> Built In</span>
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">AI Forecasting</span>
             </div>
             <div className="flex flex-col items-center sm:items-start">
               <span className="text-xl font-bold text-white flex items-center gap-2"><Server className="text-[#A855F7]" size={20}/> Enterprise</span>
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Multi-Tenant Architecture</span>
             </div>
             <div className="flex flex-col items-center sm:items-start hidden lg:flex">
               <span className="text-xl font-bold text-white flex items-center gap-2"><Activity className="text-[#FF4D8D]" size={20}/> Real-Time</span>
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Operational Intelligence</span>
             </div>
          </div>
        </section>

        {/* Inside BhojanOS */}
        <section id="dashboard" className="py-32 px-6 lg:px-12 max-w-[1400px] mx-auto text-center">
           <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={springTransition}>
             <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">Inside Bhojan<GradientText>OS</GradientText></h2>
             <p className="text-xl text-gray-400 font-medium max-w-2xl mx-auto mb-20">Stop managing your kitchen manually. Let AI help run your business with real-time operational visibility.</p>
           </motion.div>
           
           {/* Huge visual representation */}
           <div className="relative w-full aspect-video max-h-[700px] bg-[#111111] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(255,107,0,0.1)] flex items-center justify-center">
              {/* Abstract Dashboard Art */}
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-[#050505] to-[#050505]" />
              <div className="z-10 text-center">
                 <div className="w-20 h-20 mx-auto bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-xl">
                   <BarChart3 size={40} className="text-white opacity-80" />
                 </div>
                 <h3 className="text-2xl font-bold text-white mb-2">Command Center Active</h3>
                 <p className="text-gray-400 font-medium max-w-md mx-auto">Full metrics, AI alerts, and live order tracking are rendered inside your secure tenant environment.</p>
              </div>
           </div>
        </section>

        {/* Bento Grid */}
        <section id="features" className="py-24 px-6 lg:px-12 max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-3 gap-6 auto-rows-[300px]">
             {/* Feature 1: AI Forecast */}
             <GlassCard className="md:col-span-2 p-8 flex flex-col justify-between overflow-hidden relative group">
                <div className="relative z-10 max-w-sm">
                  <Sparkles className="text-[#FF6B00] mb-4" size={28} />
                  <h3 className="text-2xl font-bold text-white mb-2">AI Forecasting</h3>
                  <p className="text-gray-400 font-medium">Predict demand before it happens. Optimize your prep based on historical data, weather, and local events.</p>
                </div>
                <div className="absolute right-0 bottom-0 w-2/3 h-2/3 bg-gradient-to-tl from-[#FF6B00]/20 to-transparent blur-3xl rounded-full" />
                <LineChart className="absolute right-8 bottom-8 text-white/5 w-48 h-48 group-hover:scale-110 transition-transform duration-700" strokeWidth={1} />
             </GlassCard>

             {/* Feature 2: Customer Intel */}
             <GlassCard className="p-8 flex flex-col justify-between group">
                <div>
                  <Users className="text-[#FF4D8D] mb-4" size={28} />
                  <h3 className="text-xl font-bold text-white mb-2">Customer Intel</h3>
                  <p className="text-gray-400 text-sm font-medium">Own your customer relationships. Track retention and loyalty metrics instantly.</p>
                </div>
             </GlassCard>

             {/* Feature 3: Marketing Auto */}
             <GlassCard className="p-8 flex flex-col justify-between group bg-[#111111]/80">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <MessageCircle className="text-[#A855F7]" size={28} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#A855F7] bg-[#A855F7]/10 px-2 py-1 rounded">Coming Soon</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Customer Marketing Automation</h3>
                  <p className="text-gray-400 text-sm font-medium">Automated WhatsApp campaigns to reactivate dormant customers.</p>
                </div>
             </GlassCard>

             {/* Feature 4: Kitchen Health */}
             <GlassCard className="md:col-span-2 p-8 flex flex-col justify-between overflow-hidden relative group">
                <div className="relative z-10 max-w-md">
                  <Activity className="text-green-400 mb-4" size={28} />
                  <h3 className="text-2xl font-bold text-white mb-2">Kitchen Health Monitoring</h3>
                  <p className="text-gray-400 font-medium">Real-time alerts on inventory shortages, order delays, and system latencies. Prevent bottlenecks automatically.</p>
                </div>
                <div className="absolute right-8 bottom-8 flex items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <div className="text-green-400 font-bold">98%</div>
                  </div>
                </div>
             </GlassCard>
             
             {/* Feature 5: Inventory */}
             <GlassCard className="p-8 flex flex-col justify-between group">
                <div>
                  <Database className="text-blue-400 mb-4" size={28} />
                  <h3 className="text-xl font-bold text-white mb-2">Inventory Sync</h3>
                  <p className="text-gray-400 text-sm font-medium">Automated deductions based on exact recipe configurations.</p>
                </div>
             </GlassCard>

             {/* Feature 6: Delivery Aggregation */}
             <GlassCard className="p-8 flex flex-col justify-between group">
                <div>
                  <Globe className="text-yellow-400 mb-4" size={28} />
                  <h3 className="text-xl font-bold text-white mb-2">Delivery APIs</h3>
                  <p className="text-gray-400 text-sm font-medium">Native integrations with Shadowfax, Dunzo, and Porter.</p>
                </div>
             </GlassCard>

             {/* Feature 7: Multi-Tenant */}
             <GlassCard className="p-8 flex flex-col justify-between group relative overflow-hidden">
                <div className="relative z-10">
                  <Server className="text-white mb-4" size={28} />
                  <h3 className="text-xl font-bold text-white mb-2">SaaS Architecture</h3>
                  <p className="text-gray-400 text-sm font-medium">Isolated tenant databases ensuring enterprise-grade data security.</p>
                </div>
             </GlassCard>
          </div>
        </section>

        {/* Why BhojanOS */}
        <section className="py-32 bg-[#111111] border-y border-white/5 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#FF6B00]/5 to-transparent pointer-events-none" />
           <div className="max-w-[1400px] mx-auto px-6 lg:px-12 grid md:grid-cols-2 gap-16 items-center relative z-10">
             <div>
               <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-8 text-white">Why Food Businesses Choose BhojanOS</h2>
               <div className="space-y-6">
                 {[
                   { title: 'Own Customer Relationships', desc: 'Build your own direct ordering channel. Capture every phone number and email.' },
                   { title: 'AI Powered Operations', desc: 'Let our algorithms predict what you need to prep today, minimizing waste.' },
                   { title: 'Operational Visibility', desc: 'Monitor your entire kitchen from your phone, from anywhere in the world.' },
                   { title: 'Reduce Marketplace Dependency', desc: 'Transition your loyal customers away from high-commission aggregators.' }
                 ].map((item, i) => (
                   <div key={i} className="flex gap-4">
                     <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1">
                       <CheckCircle2 size={14} className="text-[#FF6B00]" />
                     </div>
                     <div>
                       <h4 className="text-lg font-bold text-white mb-1">{item.title}</h4>
                       <p className="text-gray-400 font-medium text-sm leading-relaxed">{item.desc}</p>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
             <div className="relative">
                <div className="aspect-square bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-br from-[#FF4D8D]/10 to-transparent mix-blend-overlay" />
                   <div className="text-center z-10">
                     <PieChart size={64} className="text-white/50 mx-auto mb-6" />
                     <div className="text-5xl font-black text-white mb-2">30%</div>
                     <div className="text-gray-400 font-bold tracking-widest uppercase text-sm">Aggregator Commissions Avoided</div>
                   </div>
                </div>
             </div>
           </div>
        </section>

        {/* Founder Story */}
        <section id="story" className="py-32 px-6 lg:px-12 max-w-[1000px] mx-auto text-center">
           <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-8">
             <Store size={24} className="text-gray-400" />
           </div>
           <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-8 text-white">Built By Someone Who Ran A Kitchen.</h2>
           <div className="text-lg md:text-xl text-gray-400 font-medium leading-relaxed space-y-6 max-w-3xl mx-auto text-left sm:text-center">
             <p>Most software for food businesses is built by software companies. BhojanOS was built after experiencing the daily realities of operating a cloud kitchen.</p>
             <p>Managing orders across five tablets. Blind inventory tracking. Late deliveries. Demanding customer expectations.</p>
             <p>We realized that to fix the restaurant business, you don't need a better menu app. You need an automated intelligence layer.</p>
             <p className="text-white font-bold italic">The product exists because food businesses deserve software that understands how kitchens actually operate.</p>
           </div>
        </section>

        {/* Enterprise Trust */}
        <section id="enterprise" className="py-24 border-y border-white/5 bg-[linear-gradient(to_bottom,#050505,#111111)]">
           <div className="max-w-[1400px] mx-auto px-6 lg:px-12 text-center">
             <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-4 text-white">Built For Scale. Secure By Design.</h2>
             <p className="text-gray-400 font-medium mb-16 max-w-2xl mx-auto">Enterprise-grade infrastructure ensuring zero downtime during your peak dinner hours.</p>
             
             <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: <Database />, title: 'Scalable Cloud', desc: 'Firebase native edge infrastructure' },
                  { icon: <ShieldCheck />, title: 'Tenant Isolation', desc: 'Strict security & data segregation' },
                  { icon: <Zap />, title: 'Real-Time', desc: 'Websocket-driven order sync' },
                  { icon: <ServerCrash />, title: '99.99% Uptime', desc: 'Redundant fallback systems' }
                ].map((t, i) => (
                  <div key={i} className="p-6 border border-white/5 bg-black/50 rounded-2xl flex flex-col items-center text-center">
                    <div className="text-gray-500 mb-4">{t.icon}</div>
                    <h4 className="text-white font-bold mb-2">{t.title}</h4>
                    <p className="text-gray-400 text-sm font-medium">{t.desc}</p>
                  </div>
                ))}
             </div>
           </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-32 px-6 lg:px-12 max-w-[1000px] mx-auto text-center relative">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[300px] bg-gradient-to-r from-[#FF6B00]/20 to-[#A855F7]/20 blur-[100px] pointer-events-none" />
           <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-8 text-white relative z-10">Stop Managing. Start Operating.</h2>
           <p className="text-xl text-gray-400 font-medium mb-12 relative z-10">Join the next generation of intelligent food brands.</p>
           <div className="flex justify-center relative z-10 w-full max-w-sm mx-auto">
             <GradientButton onClick={() => setStep('services')} className="py-5 text-xl">
               Start Free Trial
             </GradientButton>
           </div>
        </section>

      </main>

      {/* Enterprise Footer */}
      <footer className="border-t border-white/10 bg-[#050505] pt-20 pb-10 relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <img src={bhojanOsLogo} alt="Logo" className="w-8 h-8 rounded-lg" />
                <span className="font-black text-lg text-white tracking-tighter">Bhojan<GradientText>OS</GradientText></span>
              </div>
              <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-xs">The AI Operating System For Modern Food Businesses. Automate, predict, and scale.</p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-gray-400 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-gray-400 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Developers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-gray-400 font-medium">
                <li><a href="#story" className="hover:text-white transition-colors">Founder Story</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">© 2026 BhojanOS. All rights reserved.</p>
            <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default OnboardKitchen;
