import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Store, User, Phone, Mail, Lock, MessageCircle, ArrowRight, Loader2, 
  Sparkles, CheckCircle2, ShieldCheck, Headset, Users, ShoppingBag, 
  ChevronRight, Building2, Zap, Activity, PieChart,
  Globe, Database, BarChart3, LineChart, TrendingUp, LockKeyhole, ArrowUpRight, Bell, Network,
  AlertCircle, ChevronDown, Check, X
} from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { getDb } from '../lib/firebase-db';
import toast from 'react-hot-toast';
import bhojanOsLogo from '../assets/bhojan-os-logo.png';
import FounderBetaTrustBanner from '../components/FounderBetaTrustBanner';

// --- Premium UI Components ---

const BrandText = () => <span className="font-bold text-white tracking-tight">Bhojan<span className="text-[#FF6B00]">OS</span></span>;

const springTransition = { type: "spring", stiffness: 100, damping: 25 };
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: springTransition }
};

const AmbientOrbs = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 2000], [0, 400]);
  const y2 = useTransform(scrollY, [0, 2000], [0, -300]);
  const y3 = useTransform(scrollY, [0, 2000], [0, 200]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#030303]">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-soft-light pointer-events-none" />
      <m.div style={{ y: y1 }} className="absolute top-[-15%] right-[-10%] w-[800px] h-[800px] rounded-full bg-[#FF6B00] blur-[180px] opacity-[0.12] mix-blend-screen" />
      <m.div style={{ y: y2 }} className="absolute top-[40%] left-[-15%] w-[900px] h-[900px] rounded-full bg-[#A855F7] blur-[180px] opacity-[0.08] mix-blend-screen" />
      <m.div style={{ y: y3 }} className="absolute bottom-[-15%] right-[15%] w-[700px] h-[700px] rounded-full bg-[#FF4D8D] blur-[180px] opacity-[0.1] mix-blend-screen" />
    </div>
  );
};

const Spotlight = ({ className = '' }: { className?: string }) => (
  <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-white/5 blur-[120px] rounded-full pointer-events-none ${className}`} />
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
    className={`relative group overflow-hidden w-full bg-white text-black hover:bg-gray-100 transition-all duration-500 font-bold text-lg py-5 rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)] disabled:opacity-70 flex items-center justify-center gap-2 ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B00]/10 via-[#FF4D8D]/10 to-[#A855F7]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <span className="relative z-10 flex items-center gap-2">{children}</span>
  </button>
);

const OutlineButton = ({ children, onClick, className = '' }: any) => (
  <button
    onClick={onClick}
    className={`w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 text-white font-bold text-lg py-5 rounded-2xl flex items-center justify-center gap-2 ${className}`}
  >
    {children}
  </button>
);

// --- Interactive Command Center Component ---

const InteractiveCommandCenter = () => {
  const [activeTab, setActiveTab] = useState('demand');

  const tabs = [
    { id: 'demand', label: 'Demand Prediction', icon: <TrendingUp size={16} /> },
    { id: 'recipe', label: 'Recipe Intelligence', icon: <Database size={16} /> },
    { id: 'customer', label: 'Customer Graph', icon: <Users size={16} /> },
    { id: 'health', label: 'Kitchen Health', icon: <Activity size={16} /> },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto mt-24 relative z-10">
      <div className="bg-[#0A0A0A]/90 backdrop-blur-3xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]">
        {/* Browser Header */}
        <div className="h-12 bg-white/[0.02] border-b border-white/[0.05] flex items-center px-6 gap-4">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
          </div>
          <div className="flex-1 max-w-md mx-auto h-7 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-[11px] font-mono text-gray-500 gap-2">
            <LockKeyhole size={10} /> bhojanos.com/owner/command-center
          </div>
        </div>

        {/* OS Nav */}
        <div className="flex overflow-x-auto border-b border-white/[0.05] bg-white/[0.01]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-8 py-4 text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'text-[#FF6B00] border-b-2 border-[#FF6B00] bg-white/[0.02]' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.01] border-b-2 border-transparent'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-8 min-h-[400px] relative bg-black/40">
          <AnimatePresence mode="wait">
            {activeTab === 'demand' && (
              <m.div key="demand" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="h-full">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Weekend Demand Forecast</h3>
                    <p className="text-sm text-gray-400">AI projection based on last 4 weekends and current weather patterns.</p>
                  </div>
                  <span className="px-3 py-1 bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={12}/> High Confidence
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Predicted Orders</div>
                    <div className="text-3xl font-black text-white">450 - 480</div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Peak Hour</div>
                    <div className="text-3xl font-black text-white">7:30 PM</div>
                  </div>
                  <div className="bg-[#FF6B00]/5 border border-[#FF6B00]/20 rounded-xl p-5">
                    <div className="text-xs font-bold text-[#FF6B00] uppercase tracking-widest mb-1">AI Recommendation</div>
                    <div className="text-sm font-bold text-white leading-tight">Increase Biryani prep by 20% due to projected surge.</div>
                  </div>
                </div>

                {/* Minimalist Chart */}
                <div className="h-40 w-full flex items-end gap-2">
                  {[20, 30, 25, 45, 60, 90, 80, 50, 30, 20].map((h, i) => (
                    <div key={i} className="flex-1 relative group h-full flex items-end">
                      <div className="w-full bg-[#FF6B00]/20 rounded-t-sm relative" style={{ height: `${h}%` }}>
                        <div className="absolute top-0 w-full h-1 bg-[#FF6B00]" />
                      </div>
                    </div>
                  ))}
                </div>
              </m.div>
            )}

            {activeTab === 'recipe' && (
              <m.div key="recipe" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Live Inventory Deduction</h3>
                    <p className="text-sm text-gray-400">Ingredients automatically sync across the network when an order is received.</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Left: Order Flow */}
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                           <Check size={16} className="text-green-400" />
                         </div>
                         <div>
                           <div className="text-sm font-bold text-white">Order #1042 Received</div>
                           <div className="text-xs text-gray-400">2x Chicken Biryani, 1x Coke</div>
                         </div>
                      </div>
                      <span className="text-xs font-mono text-gray-500">Just Now</span>
                    </div>
                    
                    <div className="w-0.5 h-6 bg-white/10 ml-8" />
                    
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center justify-between opacity-80">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                           <Database size={16} className="text-gray-400" />
                         </div>
                         <div>
                           <div className="text-sm font-bold text-white">Looking up Master Recipe</div>
                           <div className="text-xs text-gray-400">Chicken Biryani (Large)</div>
                         </div>
                      </div>
                    </div>

                    <div className="w-0.5 h-6 bg-white/10 ml-8" />
                    
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-[#A855F7]/20 flex items-center justify-center border border-[#A855F7]/30">
                           <Activity size={16} className="text-[#A855F7]" />
                         </div>
                         <div>
                           <div className="text-sm font-bold text-white">Inventory Impact</div>
                           <div className="text-xs text-gray-400">Deducting from Central Kitchen</div>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Inventory Status */}
                  <div className="bg-[#111111] rounded-2xl border border-white/5 p-6">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Live Deductions</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-4 border-b border-white/5">
                        <span className="text-sm text-white font-medium">Basmati Rice</span>
                        <div className="text-right">
                          <span className="text-sm text-red-400 font-mono block">-400g</span>
                          <span className="text-xs text-gray-500 font-mono">14.2kg remaining</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pb-4 border-b border-white/5">
                        <span className="text-sm text-white font-medium">Chicken (Raw)</span>
                        <div className="text-right">
                          <span className="text-sm text-red-400 font-mono block">-600g</span>
                          <span className="text-xs text-gray-500 font-mono">8.4kg remaining</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white font-medium">Spices Blend</span>
                        <div className="text-right">
                          <span className="text-sm text-red-400 font-mono block">-20g</span>
                          <span className="text-xs text-gray-500 font-mono">2.1kg remaining</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </m.div>
            )}

            {activeTab === 'customer' && (
              <m.div key="customer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                 <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Customer Graph</h3>
                    <p className="text-sm text-gray-400">Track retention and purchase patterns across all connected nodes.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                   <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 col-span-2 flex items-center justify-between">
                     <div>
                       <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Customer Profile: Viswa</div>
                       <div className="text-2xl font-bold text-white mb-2">High Value / Frequent</div>
                       <div className="text-sm text-gray-400">Last order: 2 days ago. Favorite: Butter Chicken.</div>
                     </div>
                     <div className="w-16 h-16 rounded-full border-4 border-green-500 flex items-center justify-center text-green-400 font-bold text-xl">
                       98
                     </div>
                   </div>
                   <div className="bg-[#FF4D8D]/5 border border-[#FF4D8D]/20 rounded-xl p-5 flex flex-col justify-center">
                     <div className="text-xs font-bold text-[#FF4D8D] uppercase tracking-widest mb-2">Churn Risk</div>
                     <div className="text-sm text-white font-medium">12 high-value customers haven't ordered in 30+ days.</div>
                     <button className="mt-4 text-xs font-bold bg-[#FF4D8D]/20 text-[#FF4D8D] px-3 py-1.5 rounded-lg w-fit">Create Reactivation Campaign</button>
                   </div>
                </div>
              </m.div>
            )}

            {activeTab === 'health' && (
              <m.div key="health" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Kitchen Health Monitoring</h3>
                    <p className="text-sm text-gray-400">Live operational scoring and bottleneck detection.</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Healthy</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                   <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
                     <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Preparation Latency</div>
                     <div className="flex items-end gap-3 mb-2">
                       <span className="text-4xl font-black text-white">12</span>
                       <span className="text-lg font-bold text-gray-400 mb-1">min</span>
                     </div>
                     <p className="text-sm text-gray-400">Average prep time over the last hour. Operating within SLA.</p>
                   </div>

                   <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-6">
                     <div className="flex items-start gap-3">
                       <AlertCircle className="text-yellow-500 shrink-0 mt-1" size={20} />
                       <div>
                         <div className="text-sm font-bold text-white mb-1">Packaging Bottleneck Detected</div>
                         <p className="text-sm text-gray-400 mb-4">Orders are waiting 4.5 minutes on average at the packing station before handover.</p>
                         <div className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-3 py-2 rounded border border-yellow-500/20">
                           AI Rec: Assign 1 additional staff to packing station for the next 45 minutes.
                         </div>
                       </div>
                     </div>
                   </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

const OnboardKitchen = () => {
  const navigate = useNavigate();
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoName, setDemoName] = useState('');
  const [demoRestaurant, setDemoRestaurant] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoName || !demoRestaurant || !demoPhone) return;
    
    setIsSubmitting(true);
    try {
      const db = getDb();
      const newRequestRef = doc(collection(db, 'salesPipeline'));
      await setDoc(newRequestRef, {
        ownerName: demoName,
        kitchenName: demoRestaurant,
        phone: demoPhone,
        stage: 'new',
        source: 'Landing Page Demo Book',
        createdAt: serverTimestamp()
      });
      setDemoSubmitted(true);
    } catch (error) {
      console.error("Error submitting demo request:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-[#FF6B00]/30 relative">
      <AmbientOrbs />
      
      {/* Sticky Glass Navbar */}
      <header className="fixed top-0 z-50 bg-[#030303]/80 backdrop-blur-xl border-b border-white/[0.05] transition-all duration-300 w-full pt-[env(safe-area-inset-top)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 h-20 flex items-center justify-between w-full">
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
          
          <div className="hidden md:flex items-center gap-10 text-sm font-semibold text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">Demo</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/owner/login')} className="hidden sm:flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">
               Sign in
            </button>
            <button 
              onClick={() => navigate('/owner/register')}
              className="bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-[#FF6B00]/90 hover:to-orange-400 text-white font-black uppercase tracking-widest text-sm px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl shadow-lg shadow-[#FF6B00]/20 active:scale-95 transition-all w-full sm:w-auto"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 overflow-x-hidden pt-[calc(5rem+env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]">
        
        {/* Hero Section */}
        <section className="pt-16 pb-24 md:pt-32 md:pb-40 px-4 sm:px-6 lg:px-12 max-w-[1400px] mx-auto min-h-[85vh] flex flex-col justify-center items-center text-center relative">
          <Spotlight />
          <m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springTransition} className="max-w-4xl mx-auto relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-8 sm:mb-10 text-[#FF6B00] shadow-[0_0_30px_rgba(255,107,0,0.1)]">
              <Sparkles size={14} /> The All-In-One Restaurant System
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[6.5rem] font-black tracking-tighter mb-8 sm:mb-10 leading-[1] sm:leading-[0.95]">
              Automate Your Kitchen.<br/> Double Your <GradientText>Margins.</GradientText>
            </h1>
            <div className="text-lg sm:text-xl text-gray-400 font-medium leading-relaxed mb-10 sm:mb-14 max-w-2xl mx-auto space-y-3 px-2">
              <p><BrandText /> replaces your messy POS, delivery tablets, and inventory spreadsheets with a single smart platform that runs your food business on autopilot.</p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-5 max-w-md mx-auto">
              <GradientButton onClick={() => navigate('/owner/register')}>
                Start Free Trial <ArrowRight size={18} />
              </GradientButton>
              <OutlineButton onClick={() => setShowDemoModal(true)}>
                Book Demo
              </OutlineButton>
            </div>
          </m.div>
        </section>

        {/* Features / Why Fails */}
        <section id="features" className="py-24 md:py-40 border-y border-white/[0.05] bg-white/[0.01] relative px-4 sm:px-6">
          <div className="max-w-[1400px] mx-auto lg:px-12 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter mb-6 text-white">Why Cloud Kitchens Switch to <BrandText /></h2>
            <p className="text-lg sm:text-xl text-gray-400 font-medium mb-16 md:mb-24 max-w-3xl mx-auto">Stop guessing how much food to prep and start knowing exactly what your kitchen needs.</p>
            
            <div className="grid md:grid-cols-2 gap-0 max-w-5xl mx-auto rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
               {/* Left: The Old Way (Red) */}
               <div className="bg-[#1A0505] p-10 md:p-14 text-left border-b md:border-b-0 md:border-r border-white/5">
                 <div className="flex items-center gap-3 mb-10">
                   <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                     <X size={16} className="text-red-500" />
                   </div>
                   <h3 className="text-xl font-bold text-red-400">The Old Way</h3>
                 </div>
                 <ul className="space-y-8">
                   {[
                     { title: 'Tablet Hell', desc: 'Managing Swiggy, Zomato, and Dine-in on 4 different screens.' },
                     { title: 'Wasted Food', desc: 'Prepping based on guesses, leading to massive daily waste.' },
                     { title: 'Missing Inventory', desc: 'Finding out you are out of chicken right in the middle of dinner rush.' },
                     { title: 'Blind Profits', desc: 'Waiting until the end of the month to know if you made any money.' }
                   ].map((item, i) => (
                     <li key={i}>
                       <span className="text-gray-300 font-bold block mb-1">{item.title}</span>
                       <span className="text-gray-500 text-sm font-medium">{item.desc}</span>
                     </li>
                   ))}
                 </ul>
               </div>

               {/* Right: The New Way (Green/Brand) */}
               <div className="bg-gradient-to-b from-[#0A1A0F] to-[#030303] p-10 md:p-14 text-left relative overflow-hidden">
                 <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none" />
                  <div className="flex items-center gap-3 mb-10 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                      <Check size={16} className="text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">The <BrandText /> Way</h3>
                  </div>
                 <ul className="space-y-8 relative z-10">
                   {[
                     { title: 'One Single Screen', desc: 'All your orders, from every app, managed in one beautiful dashboard.' },
                     { title: 'AI Demand Forecast', desc: 'We tell you exactly how many portions to prep before the shift starts.' },
                     { title: 'Auto-Tracking Inventory', desc: 'Every order automatically deducts the exact ingredients used.' },
                     { title: 'Live Profitability', desc: 'Know your exact food costs and profit margins in real-time.' }
                   ].map((item, i) => (
                     <li key={i}>
                       <span className="text-green-400 font-bold block mb-1">{item.title}</span>
                       <span className="text-gray-400 text-sm font-medium">{item.desc}</span>
                     </li>
                   ))}
                 </ul>
               </div>
            </div>
          </div>
        </section>

        {/* Interactive Command Center */}
        <section id="demo" className="py-24 md:py-40 px-4 sm:px-6 lg:px-12 relative overflow-hidden">
          <Spotlight className="opacity-30 mix-blend-screen" />
          <div className="text-center relative z-10 mb-10">
             <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-6 text-white">See It In Action</h2>
             <p className="text-lg sm:text-xl text-gray-400 font-medium max-w-2xl mx-auto">Click through the tabs to experience how <BrandText /> makes running a kitchen effortless.</p>
          </div>
          <InteractiveCommandCenter />
        </section>

        {/* How It Works (Replaces Architecture) */}
        <section id="how-it-works" className="py-40 bg-white/[0.02] border-y border-white/[0.05] relative">
           <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
             <div className="text-center mb-24">
               <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6 text-white">How It Works</h2>
               <p className="text-xl text-gray-400 font-medium max-w-3xl mx-auto">Get up and running in minutes, not weeks. No technical skills required.</p>
             </div>
             
             <div className="grid md:grid-cols-3 gap-8">
                {[
                  { step: '01', title: 'Connect Your Menu', desc: 'Import your existing menu or let us build it for you. Add your recipes and ingredient costs once.' },
                  { step: '02', title: 'Take Orders', desc: 'Start receiving orders from your storefront, dine-in QR codes, or delivery aggregators instantly.' },
                  { step: '03', title: 'Run on Autopilot', desc: <React.Fragment><BrandText /> automatically tracks inventory, predicts tomorrow's demand, and calculates your profit margins.</React.Fragment> }
                ].map((t, i) => (
                  <div key={i} className="p-10 border border-white/[0.05] bg-[#0A0A0A] rounded-[2rem] flex flex-col relative overflow-hidden group hover:border-[#FF6B00]/30 transition-colors">
                    <div className="text-[120px] font-black text-white/[0.02] absolute -right-4 -bottom-10 group-hover:text-[#FF6B00]/[0.05] transition-colors">{t.step}</div>
                    <div className="text-[#FF6B00] font-black text-2xl mb-6">{t.step}</div>
                    <h4 className="text-xl text-white font-bold mb-4 relative z-10">{t.title}</h4>
                    <p className="text-gray-400 font-medium leading-relaxed relative z-10">{t.desc}</p>
                  </div>
                ))}
             </div>
           </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-40 px-6 lg:px-12 max-w-[1200px] mx-auto text-center relative border-b border-white/[0.05]">
           <div className="text-center mb-16">
             <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6 text-white">Simple, Transparent Pricing</h2>
             <p className="text-xl text-gray-400 font-medium max-w-2xl mx-auto mb-10">Everything you need to run your restaurant, for less than the cost of one wrong inventory order.</p>
             <FounderBetaTrustBanner />
           </div>
           
           <div className="bg-[#0A0A0A] border border-white/[0.05] rounded-[3rem] p-10 md:p-16 max-w-4xl mx-auto relative overflow-hidden shadow-2xl shadow-purple-500/5">
             <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#FF6B00] to-[#A855F7]" />
             <div className="flex flex-col md:flex-row items-center justify-between gap-12 text-left">
               <div className="flex-1 w-full">
                 <h3 className="text-3xl font-black text-white mb-2"><BrandText /> Pro</h3>
                 <p className="text-gray-400 mb-8">Unlimited orders, users, and recipes for one cloud kitchen location.</p>
                 <div className="flex items-baseline gap-2 mb-8">
                   <span className="text-5xl font-black text-white">₹1,999</span>
                   <span className="text-gray-500 font-bold">/month</span>
                 </div>
                 <GradientButton onClick={() => navigate('/owner/register')} className="w-full">
                   Start 14-Day Free Trial
                 </GradientButton>
               </div>
               <div className="flex-1 bg-white/[0.02] p-8 rounded-2xl border border-white/5 w-full">
                 <ul className="space-y-4">
                   {['All-in-one POS System', 'AI Demand Forecasting', 'Live Inventory Tracking', 'Customer Retention Tools', 'Free Updates Forever'].map((feature, i) => (
                     <li key={i} className="flex items-center gap-3">
                       <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                       <span className="text-gray-300 font-medium">{feature}</span>
                     </li>
                   ))}
                 </ul>
               </div>
             </div>
           </div>
        </section>

        {/* Founder Story */}
        <section id="origin" className="py-40 px-6 lg:px-12 max-w-[1000px] mx-auto text-center relative border-b border-white/[0.05]">
           <Spotlight className="top-1/2 -translate-y-1/2 opacity-20" />
           <div className="relative z-10">
             <div className="w-20 h-20 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-12">
               <Store size={32} className="text-[#FF6B00]" />
             </div>
             <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter mb-4 text-white">Built by Vishwa kalyan.</h2>
             <div className="text-lg sm:text-xl text-gray-400 font-medium leading-relaxed space-y-6 max-w-4xl mx-auto text-left sm:text-center px-2 mb-12">
               <p>BhojanOS was created after experiencing the real operational struggles of running a cloud kitchen and food business.</p>
               <p>Managing orders, inventory, customer retention, and daily operations manually became overwhelming.</p>
               <p>BhojanOS was built to help food entrepreneurs automate operations, increase revenue, reduce waste, and grow sustainable businesses using AI-powered insights.</p>
               <p className="text-[#FF6B00] font-bold">Built in India 🇮🇳 for food entrepreneurs.</p>
             </div>
           </div>
        </section>

        {/* Final CTA */}
        <section className="py-40 px-6 lg:px-12 max-w-[1000px] mx-auto text-center relative border-t border-white/[0.05]">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[400px] bg-gradient-to-r from-[#FF6B00]/20 via-transparent to-[#A855F7]/20 blur-[120px] pointer-events-none mix-blend-screen" />
           <h2 className="text-5xl md:text-6xl lg:text-[5rem] font-black tracking-tighter mb-10 text-white relative z-10 leading-[0.95]">
             Ready To Run Your Kitchen On Autopilot?
           </h2>
           <div className="text-2xl text-gray-400 font-medium mb-16 relative z-10 space-y-3">
             <p>Join smart cloud kitchen owners who have doubled their margins.</p>
           </div>
           <div className="flex flex-col sm:flex-row justify-center gap-5 relative z-10 w-full max-w-md mx-auto">
             <GradientButton onClick={() => navigate('/owner/register')}>
               Start Free Trial
             </GradientButton>
             <OutlineButton onClick={() => setShowDemoModal(true)}>
               Book Demo
             </OutlineButton>
           </div>
        </section>

      </main>

      {/* Enterprise Footer */}
      <footer className="border-t border-white/[0.05] bg-[#030303] pt-24 pb-12 relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 lg:gap-12 mb-20">
            <div className="col-span-2 md:col-span-4 lg:col-span-2">
              <div className="flex items-center gap-3 mb-8">
                <img src={bhojanOsLogo} alt="Logo" className="w-10 h-10 rounded-xl" />
                <span className="font-black text-2xl text-white tracking-tighter">Bhojan<GradientText>OS</GradientText></span>
              </div>
              <p className="text-gray-400 text-base font-medium leading-relaxed max-w-sm">The AI Operating System For Modern Food Businesses. Automate, predict, and scale with true operational intelligence.</p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Platform</h4>
              <ul className="space-y-4 text-base text-gray-400 font-medium">
                <li><a href="#command-center" className="hover:text-white transition-colors">Command Center</a></li>
                <li><a href="#architecture" className="hover:text-white transition-colors">Architecture Proof</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Resources</h4>
              <ul className="space-y-4 text-base text-gray-400 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Getting Started</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Video Tutorials</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help & Support</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Company</h4>
              <ul className="space-y-4 text-base text-gray-400 font-medium">
                <li><a href="#origin" className="hover:text-white transition-colors">About Founder</a></li>
                <li><a href="mailto:bhojanos26@gmail.com" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="https://wa.me/917666258454" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp Support</a></li>
              </ul>
            </div>

            <div className="col-span-2 md:col-span-1 lg:col-span-1">
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Contact Us</h4>
              <ul className="space-y-4 text-sm text-gray-400 font-medium">
                <li className="flex items-center gap-3"><Mail size={16} className="text-[#FF6B00]" /> <a href="mailto:bhojanos26@gmail.com" className="hover:text-white transition-colors">bhojanos26@gmail.com</a></li>
                <li className="flex items-center gap-3"><Phone size={16} className="text-[#FF6B00]" /> <a href="tel:+917666258454" className="hover:text-white transition-colors">+91 7666258454</a></li>
                <li className="flex items-center gap-3"><MessageCircle size={16} className="text-green-500" /> WhatsApp Support Available</li>
                <li className="mt-4 pt-4 border-t border-white/10">
                  <span className="block text-white/50 text-xs mb-1">Support Hours:</span>
                  9:00 AM – 9:00 PM IST
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-10 border-t border-white/[0.05] flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">© 2026 BhojanOS. All rights reserved.</p>
            <div className="flex items-center gap-8 text-sm font-medium text-gray-500">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Book Demo Modal */}
      <AnimatePresence>
        {showDemoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDemoModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#111111] border border-white/10 rounded-3xl p-8 max-w-md w-full relative z-10 shadow-2xl">
              <button onClick={() => setShowDemoModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
              
              {!demoSubmitted ? (
                <>
                  <h3 className="text-2xl font-black text-white mb-2">Book a Live Demo</h3>
                  <p className="text-gray-400 text-sm mb-6">See how <BrandText /> can double your kitchen's margins. Pick a time that works for you.</p>
                  
                  <form onSubmit={handleDemoSubmit} className="space-y-4 mb-8">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Your Name</label>
                      <input required type="text" value={demoName} onChange={(e) => setDemoName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF6B00] transition-colors" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Restaurant Name</label>
                      <input required type="text" value={demoRestaurant} onChange={(e) => setDemoRestaurant(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF6B00] transition-colors" placeholder="Cloud Kitchen 101" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Phone Number</label>
                      <input required type="tel" value={demoPhone} onChange={(e) => setDemoPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF6B00] transition-colors" placeholder="+91 99999 99999" />
                    </div>
                    
                    <div className="pt-4">
                      <GradientButton type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <span className="flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Submitting...</span> : 'Schedule Demo'}
                      </GradientButton>
                    </div>
                  </form>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={32} className="text-green-500" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">Demo Requested!</h3>
                  <p className="text-gray-400 text-sm mb-8">Our team will contact you shortly to confirm your live walk-through of <BrandText />.</p>
                  <OutlineButton onClick={() => setShowDemoModal(false)}>Close</OutlineButton>
                </div>
              )}
            </m.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default OnboardKitchen;
