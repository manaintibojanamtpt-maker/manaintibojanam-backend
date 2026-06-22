import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, User, Phone, Mail, Lock, MessageCircle, ArrowRight, Loader2, 
  Sparkles, CheckCircle2, ShieldCheck, Headset, Users, ShoppingBag, 
  ChevronDown, ChevronLeft, Building2, Zap, Activity, PieChart, 
  Globe, Smartphone
} from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { getDb } from '../lib/firebase-db';
import toast from 'react-hot-toast';
import bhojanOsLogo from '../assets/bhojan-os-logo.png';

// --- Premium UI Components ---

const AmbientOrbs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#ff7a18] blur-[140px] opacity-20 mix-blend-screen" />
    <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#9333ea] blur-[140px] opacity-15 mix-blend-screen" />
    <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] rounded-full bg-[#ec4899] blur-[140px] opacity-20 mix-blend-screen" />
  </div>
);

const GlassCard = ({ children, className = '', onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.4)] transition-all duration-300 hover:bg-white/10 hover:border-white/20 ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children}
  </div>
);

const GradientText = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <span className={`bg-gradient-to-r from-orange-400 via-pink-400 to-purple-500 bg-clip-text text-transparent ${className}`}>
    {children}
  </span>
);

const GradientButton = ({ children, onClick, type = 'button', disabled = false, className = '' }: any) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`w-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_30px_rgba(255,120,0,0.25)] disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2 ${className}`}
  >
    {children}
  </button>
);

const ProgressBar = ({ step }: { step: 'landing' | 'services' | 'register' | 'success' }) => {
  const steps = ['landing', 'services', 'register', 'success'];
  const currentIndex = steps.indexOf(step);
  const progress = Math.max(10, (currentIndex / (steps.length - 1)) * 100);

  return (
    <div className="w-full max-w-sm mx-auto mb-8">
      <div className="flex justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
        <span>{step === 'landing' ? 'Welcome' : step === 'services' ? 'Service' : step === 'register' ? 'Account' : 'Done'}</span>
        <span>{Math.round(progress)}% Complete</span>
      </div>
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-orange-400 via-pink-400 to-purple-500"
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
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-orange-400 transition-colors">
          {icon}
        </div>
      )}
      <input 
        id={id} 
        required 
        className={`w-full bg-white/5 border border-white/10 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 rounded-xl py-3.5 ${icon ? 'pl-11' : 'px-4'} pr-4 text-white text-base font-semibold placeholder:text-gray-500 outline-none transition-all shadow-inner`} 
        {...props} 
      />
    </div>
  </div>
);

// --- Data ---

const faqs = [
  { question: 'What are the documents and details required?', answer: 'FSSAI certification, PAN card, GST certificate (if applicable), and bank account details for payouts.' },
  { question: 'How long will it take to go live on BhojanOS?', answer: 'With our automated AI verification, your restaurant can go live in 24-48 hours once documents are uploaded.' },
  { question: 'What is the one-time onboarding fee?', answer: 'BhojanOS charges zero onboarding fees! Start your 7-day free trial immediately without a credit card.' },
  { question: 'How can I get help and support?', answer: 'Our dedicated partner support team is available 24/7 via phone, email, and live chat from your Dashboard.' }
];

const testimonials = [
  { quote: "BhojanOS enabled me to restart my operations when I had no hope. My online ordering business has done so well, it took over my dining business!", name: "Arshad Khan", role: "Owner - Khushboo Biryani" },
  { quote: "The AI insights and automated marketing tools are powerful instruments. I highly recommend them to any ambitious restaurant owner looking for growth.", name: "Vikas Sharma", role: "Founder - Spice Route" }
];

const features = [
  { icon: <Zap size={18} className="text-orange-400" />, text: "AI Operations" },
  { icon: <Activity size={18} className="text-pink-400" />, text: "Smart Order Management" },
  { icon: <MessageCircle size={18} className="text-purple-400" />, text: "WhatsApp Automation" },
  { icon: <Globe size={18} className="text-amber-400" />, text: "Live Delivery Tracking" },
  { icon: <PieChart size={18} className="text-orange-400" />, text: "Customer Intelligence" },
  { icon: <Building2 size={18} className="text-pink-400" />, text: "Multi-Outlet Support" }
];

// --- Main Component ---

const OnboardKitchen = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'landing' | 'services' | 'register'>('landing');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tenantSlug, setTenantSlug] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    kitchenName: '', ownerName: '', phone: '', whatsapp: '', email: '', password: '', serviceType: ''
  });

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo(0, 0);
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
        branding: { primaryColor: '#f97316', logoUrl: '' },
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
      setSuccess(true);
      toast.success('Kitchen created successfully!');
      setTimeout(() => navigate('/owner/settings'), 3000);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') toast.error("This email is already registered. Please log in.");
      else if (error.code === 'auth/weak-password') toast.error("Password is too weak. Please use at least 6 characters.");
      else if (error.code === 'auth/invalid-email') toast.error("Please enter a valid email address.");
      else toast.error(error.message || 'Failed to create kitchen. Please try again.');
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="min-h-[100dvh] bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <AmbientOrbs />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-md">
          <GlassCard className="p-8 sm:p-10 text-center">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10 relative">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
                <CheckCircle2 size={48} className="text-orange-400" />
              </motion.div>
            </div>
            <h2 className="text-3xl font-extrabold mb-4 tracking-tight"><GradientText>Store Created!</GradientText></h2>
            <p className="text-gray-300 mb-8 font-medium leading-relaxed">Welcome to BhojanOS. Your account has been provisioned successfully.</p>
            <div className="bg-white/5 rounded-2xl p-5 mb-10 border border-white/10">
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">YOUR STORE URL</p>
              <p className="text-orange-400 font-bold text-sm sm:text-base break-all select-all">bhojanos.com/k/{tenantSlug}</p>
            </div>
            <div className="flex justify-center items-center gap-3">
              <Loader2 className="animate-spin text-orange-500" size={24} />
              <span className="text-sm text-gray-400 font-semibold tracking-wide">Entering Owner Dashboard...</span>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white font-sans flex flex-col selection:bg-orange-500/30 overflow-x-hidden relative">
      <AmbientOrbs />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/10 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 shadow-sm w-full">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12 flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            {step !== 'landing' && (
              <button onClick={() => setStep(step === 'register' ? 'services' : 'landing')} className="mr-2 p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300">
                <ChevronLeft size={24} />
              </button>
            )}
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-sm ring-1 ring-white/10 overflow-hidden">
              <img src={bhojanOsLogo} alt="BhojanOS Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter leading-none text-white">
                Bhojan<GradientText>OS</GradientText>
              </h1>
            </div>
          </div>
          <button onClick={() => navigate('/owner/login')} className="flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10">
            <User size={16} /> <span className="hidden sm:inline">Owner Login</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto relative z-10 px-6 lg:px-12 pb-[120px] sm:pb-32 overflow-x-hidden">
        
        {step !== 'landing' && (
          <div className="pt-8">
            <ProgressBar step={step} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-safe">
              
              {/* Premium Hero Section */}
              <section className="py-16 sm:py-24 text-center max-w-4xl mx-auto border-b border-white/10">
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest mb-8 text-gray-300 shadow-[0_0_20px_rgba(255,120,0,0.1)]">
                  <Sparkles size={14} className="text-orange-400" /> The AI Operating System
                </div>
                <h2 className="text-5xl sm:text-7xl lg:text-[5.5rem] font-black tracking-tighter mb-6 leading-[1.1]">
                  Launch With <br className="hidden sm:block" /> Bhojan<GradientText>OS AI</GradientText>
                </h2>
                <p className="text-xl sm:text-2xl text-gray-400 max-w-2xl mx-auto mb-10 font-medium leading-relaxed px-2">
                  The Operating System Built For Modern Cloud Kitchens, Restaurants, Cafes, and Food Brands.
                </p>

                <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-3xl mx-auto">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl backdrop-blur-md shadow-sm">
                      {f.icon}
                      <span className="text-sm font-semibold text-gray-200">{f.text}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Value Props */}
              <section className="py-16 border-b border-white/10">
                <div className="grid sm:grid-cols-3 gap-8">
                  <GlassCard className="p-8 text-center sm:text-left flex flex-col items-center sm:items-start">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 border border-orange-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,120,0,0.2)]">
                      <Users size={32} strokeWidth={1.5} className="text-orange-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-white">Attract new customers</h3>
                    <p className="text-gray-400 font-medium leading-relaxed">Reach millions of people ordering on our enterprise AI platform.</p>
                  </GlassCard>
                  <GlassCard className="p-8 text-center sm:text-left flex flex-col items-center sm:items-start">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(236,72,153,0.2)]">
                      <ShoppingBag size={32} strokeWidth={1.5} className="text-pink-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-white">Doorstep delivery convenience</h3>
                    <p className="text-gray-400 font-medium leading-relaxed">Easily get your orders delivered through our trained partners.</p>
                  </GlassCard>
                  <GlassCard className="p-8 text-center sm:text-left flex flex-col items-center sm:items-start">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-amber-500/20 border border-purple-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(147,51,234,0.2)]">
                      <Headset size={32} strokeWidth={1.5} className="text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-white">Dedicated onboarding support</h3>
                    <p className="text-gray-400 font-medium leading-relaxed">Get live hand-holding and setup assistance at zero cost.</p>
                  </GlassCard>
                </div>
              </section>

              {/* Success Stories */}
              <section className="py-16">
                <h2 className="text-3xl font-black text-center mb-12 text-white">Restaurant success stories</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {testimonials.map((t, i) => (
                    <GlassCard key={i} className="p-8">
                      <p className="text-gray-300 font-medium text-base mb-8 leading-relaxed italic">"{t.quote}"</p>
                      <div className="flex items-center gap-4 border-t border-white/10 pt-6">
                        <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                          <User size={24} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{t.name}</p>
                          <p className="text-sm text-orange-400 font-medium">{t.role}</p>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </section>

              {/* FAQs */}
              <section className="py-16 max-w-3xl mx-auto">
                <h2 className="text-3xl font-black text-center mb-12 text-white">Frequently asked questions</h2>
                <div className="space-y-4">
                  {faqs.map((faq, i) => (
                    <GlassCard key={i} className="overflow-hidden">
                      <button 
                        onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                        className="w-full text-left px-6 py-5 flex items-center justify-between font-bold text-gray-200 hover:text-white transition-colors"
                      >
                        <span className="pr-4">{faq.question}</span>
                        <ChevronDown className={`shrink-0 transition-transform text-orange-400 ${activeFaq === i ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {activeFaq === i && (
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="px-6 pb-5 pt-2 text-gray-400 font-medium leading-relaxed border-t border-white/10">
                              {faq.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </GlassCard>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {step === 'services' && (
            <motion.div key="services" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl mx-auto py-8">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-black mb-4 text-white">Select Your Service Model</h2>
                <p className="text-gray-400 font-medium">Choose how you want to reach your customers on BhojanOS.</p>
              </div>
              
              <div className="space-y-6">
                {[
                  { id: 'both', title: 'Delivery & Dining', desc: 'List your restaurant on both the delivery and dining sections. Maximum reach.', icon: <Building2 className="text-orange-400" size={32} /> },
                  { id: 'delivery', title: 'Delivery Only (Cloud Kitchen)', desc: 'List your restaurant in the delivery section only. Optimized for speed.', icon: <ShoppingBag className="text-pink-400" size={32} /> },
                  { id: 'dining', title: 'Dining Only', desc: 'List your restaurant in the dining section only. Perfect for cafes and fine dining.', icon: <Store className="text-purple-400" size={32} /> }
                ].map((s) => (
                  <GlassCard 
                    key={s.id} 
                    onClick={() => { setFormData({...formData, serviceType: s.id}); setStep('register'); }}
                    className={`p-6 sm:p-8 relative overflow-hidden group ${formData.serviceType === s.id ? 'border-orange-500/50 bg-orange-500/10 shadow-[0_0_30px_rgba(255,120,0,0.15)]' : ''}`}
                  >
                    <div className="pr-24">
                      <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                      <p className="text-gray-400 font-medium mb-4 leading-relaxed">{s.desc}</p>
                      <span className="text-orange-400 font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                        Configure <ArrowRight size={16} />
                      </span>
                    </div>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                      {s.icon}
                    </div>
                  </GlassCard>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'register' && (
            <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-xl mx-auto py-8">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-black mb-3 text-white">Create Your Account</h2>
                <p className="text-gray-400 font-medium">Provisioning secure access for {formData.serviceType === 'both' ? 'Delivery & Dining' : formData.serviceType === 'delivery' ? 'Cloud Kitchen' : 'Dining'}.</p>
              </div>

              <GlassCard className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <FormInput id="kitchenName" label="Business Name" icon={<Store size={18} />} type="text" value={formData.kitchenName} onChange={(e) => setFormData({...formData, kitchenName: e.target.value})} placeholder="e.g. Spice Kitchen" />
                  <FormInput id="ownerName" label="Owner Full Name" icon={<User size={18} />} type="text" value={formData.ownerName} onChange={(e) => setFormData({...formData, ownerName: e.target.value})} placeholder="Legal name" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormInput id="phone" label="Phone Number" icon={<Phone size={18} />} type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="10 digit mobile" />
                    <FormInput id="whatsapp" label="WhatsApp Number" icon={<MessageCircle size={18} />} type="tel" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} placeholder="For AI order sync" />
                  </div>
                  <div className="pt-6 border-t border-white/10 mt-6">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Secure Login Credentials</p>
                    <div className="space-y-6">
                      <FormInput id="email" label="Admin Email" icon={<Mail size={18} />} type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="name@restaurant.com" />
                      <FormInput id="password" label="Master Password" icon={<Lock size={18} />} type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="Min. 6 characters" />
                    </div>
                  </div>

                  <div className="pt-6">
                    <GradientButton type="submit" disabled={loading}>
                      {loading ? <><Loader2 className="animate-spin" size={20}/> Provisioning Instance...</> : 'Launch Free Trial'}
                    </GradientButton>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sticky Bottom Actions / CTA (Hidden if success state) */}
      {!success && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#050505]/80 backdrop-blur-2xl border-t border-white/10 z-50 flex flex-col items-center shadow-[0_-20px_40px_rgba(0,0,0,0.5)] pb-[max(env(safe-area-inset-bottom),1rem)] w-full">
          {step === 'landing' && (
            <div className="w-full max-w-3xl">
              <GradientButton onClick={() => setStep('services')}>
                Get Started
              </GradientButton>
            </div>
          )}
          <div className="flex items-center gap-6 mt-4 w-full justify-center">
            <button onClick={() => navigate('/owner/login')} className="text-sm font-bold text-gray-400 hover:text-white transition-colors">Already registered? Log in</button>
            <a href="tel:7666258454" className="text-sm font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1"><Headset size={14}/> Support</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardKitchen;
