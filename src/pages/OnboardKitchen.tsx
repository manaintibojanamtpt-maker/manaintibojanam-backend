import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Store, User, Phone, Mail, Lock, MessageCircle, ArrowRight, Loader2, 
  Sparkles, CheckCircle2, ShieldCheck, Headset, Users, ShoppingBag, 
  ChevronRight, Building2, Zap, Activity, PieChart, Server,
  Globe, Database, BarChart3, LineChart, TrendingUp, LockKeyhole, ArrowUpRight, Bell, Network,
  AlertCircle, ChevronDown, Check, X
} from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { getDb } from '../lib/firebase-db';
import toast from 'react-hot-toast';
import bhojanOsLogo from '../assets/bhojan-os-logo.png';

// --- Premium UI Components ---

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
      <motion.div style={{ y: y1 }} className="absolute top-[-15%] right-[-10%] w-[800px] h-[800px] rounded-full bg-[#FF6B00] blur-[180px] opacity-[0.12] mix-blend-screen" />
      <motion.div style={{ y: y2 }} className="absolute top-[40%] left-[-15%] w-[900px] h-[900px] rounded-full bg-[#A855F7] blur-[180px] opacity-[0.08] mix-blend-screen" />
      <motion.div style={{ y: y3 }} className="absolute bottom-[-15%] right-[15%] w-[700px] h-[700px] rounded-full bg-[#FF4D8D] blur-[180px] opacity-[0.1] mix-blend-screen" />
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
              <motion.div key="demand" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="h-full">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Weekend Demand Forecast</h3>
                    <p className="text-sm text-gray-400">AI projection based on last 4 weekends and current weather patterns.</p>
                  </div>
                  <span className="px-3 py-1 bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={12}/> High Confidence
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-6 mb-8">
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
              </motion.div>
            )}

            {activeTab === 'recipe' && (
              <motion.div key="recipe" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
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
              </motion.div>
            )}

            {activeTab === 'customer' && (
              <motion.div key="customer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
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
              </motion.div>
            )}

            {activeTab === 'health' && (
              <motion.div key="health" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
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
              </motion.div>
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
  const [step, setStep] = useState<'landing' | 'services' | 'register' | 'success'>('landing');
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-[#FF6B00]/30 relative">
      <AmbientOrbs />
      
      {/* Sticky Glass Navbar */}
      <header className="fixed top-0 z-50 bg-[#030303]/50 backdrop-blur-xl border-b border-white/[0.05] transition-all duration-300 w-full">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 h-20 flex items-center justify-between w-full">
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
            <a href="#why-fail" className="hover:text-white transition-colors">The Problem</a>
            <a href="#command-center" className="hover:text-white transition-colors">Command Center</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#origin" className="hover:text-white transition-colors">Founder Story</a>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/owner/login')} className="hidden sm:flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">
               Sign in
            </button>
            <button onClick={() => setStep('services')} className="bg-white text-black hover:bg-gray-200 transition-colors px-6 py-2.5 rounded-full text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)]">
               Book Demo
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 overflow-x-hidden pt-20">
        
        {/* Hero Section */}
        <section className="pt-32 pb-40 px-6 lg:px-12 max-w-[1400px] mx-auto min-h-[85vh] flex flex-col justify-center items-center text-center relative">
          <Spotlight />
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={springTransition} className="max-w-4xl mx-auto relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest mb-10 text-[#FF6B00] shadow-[0_0_30px_rgba(255,107,0,0.1)]">
              <Sparkles size={14} /> The AI Operating System
            </div>
            <h1 className="text-6xl md:text-7xl lg:text-[7rem] font-black tracking-tighter mb-10 leading-[0.95]">
              Stop Managing. <br/> Start <GradientText>Operating.</GradientText>
            </h1>
            <div className="text-2xl text-gray-400 font-medium leading-relaxed mb-14 max-w-3xl mx-auto space-y-3">
              <p className="text-white font-bold">This is not restaurant software.</p>
              <p>BhojanOS is an AI Operating System that predicts demand, perfectly syncs inventory, and autonomously alerts you to operational bottlenecks before they happen.</p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-5 max-w-md mx-auto">
              <GradientButton onClick={() => setStep('services')}>
                Book Demo <ArrowRight size={18} />
              </GradientButton>
              <OutlineButton onClick={() => setStep('services')}>
                Start Free Trial
              </OutlineButton>
            </div>
          </motion.div>
        </section>

        {/* Why Existing Restaurant Software Fails */}
        <section id="why-fail" className="py-40 border-y border-white/[0.05] bg-white/[0.01] relative">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6 text-white">Why Existing Restaurant Software Fails</h2>
            <p className="text-xl text-gray-400 font-medium mb-24 max-w-3xl mx-auto">Traditional POS systems record what happened. An AI Operating System predicts what happens next.</p>
            
            <div className="grid md:grid-cols-2 gap-0 max-w-5xl mx-auto rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
               {/* Left: The Old Way (Red) */}
               <div className="bg-[#1A0505] p-10 md:p-14 text-left border-b md:border-b-0 md:border-r border-white/5">
                 <div className="flex items-center gap-3 mb-10">
                   <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                     <X size={16} className="text-red-500" />
                   </div>
                   <h3 className="text-xl font-bold text-red-400">Generic POS Software</h3>
                 </div>
                 <ul className="space-y-8">
                   {[
                     { title: 'Disconnected Tools', desc: 'Separate apps for delivery, dine-in, inventory, and accounting.' },
                     { title: 'Manual Inventory', desc: 'End-of-day stock counting reliant on human accuracy.' },
                     { title: 'No Forecasting', desc: 'Prepping based on gut-feeling, leading to massive food waste.' },
                     { title: 'Reactive Reporting', desc: 'Looking at excel sheets at the end of the month to find out why you lost money.' }
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
                   <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                     <Check size={16} className="text-green-400" />
                   </div>
                   <h3 className="text-xl font-bold text-white">BhojanOS Proactive AI</h3>
                 </div>
                 <ul className="space-y-8 relative z-10">
                   {[
                     { title: 'Unified Intelligence', desc: 'One central brain managing all ingest nodes autonomously.' },
                     { title: 'Predictive Supply', desc: 'Master recipes automatically deduct precise grams per order instantly.' },
                     { title: 'AI Predictions', desc: 'Forecast demand based on historical trends and external factors.' },
                     { title: 'Proactive Alerts', desc: 'Get notified of packaging bottlenecks before the customer complains.' }
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
        <section id="command-center" className="py-40 px-6 lg:px-12 relative overflow-hidden">
          <Spotlight className="opacity-30 mix-blend-screen" />
          <div className="text-center relative z-10 mb-10">
             <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-6 text-white">Interactive Command Center</h2>
             <p className="text-xl text-gray-400 font-medium max-w-2xl mx-auto">Click through the tabs to experience how BhojanOS manages decisions, not just transactions.</p>
          </div>
          <InteractiveCommandCenter />
        </section>

        {/* Technical Architecture Proof */}
        <section id="architecture" className="py-40 bg-white/[0.02] border-y border-white/[0.05] relative">
           <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
             <div className="text-center mb-24">
               <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6 text-white">Enterprise Architecture Proof</h2>
               <p className="text-xl text-gray-400 font-medium max-w-3xl mx-auto">We don't just build UI. We build highly secure, isolated tenant infrastructure using actual enterprise technologies.</p>
             </div>
             
             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { icon: <Server size={32}/>, title: 'Multi-Tenant Architecture', desc: 'Absolute data isolation. Every kitchen operates within its own securely scoped Firestore tenant environment.' },
                  { icon: <Database size={32}/>, title: 'Firebase Infrastructure', desc: 'Built on Google\'s globally distributed backend for zero-maintenance scaling and world-class reliability.' },
                  { icon: <Zap size={32}/>, title: 'Real-Time Synchronization', desc: 'Orders, inventory deductions, and health alerts sync across all devices instantly using live snapshot listeners.' },
                  { icon: <ShieldCheck size={32}/>, title: 'Role-Based Access', desc: 'Granular security rules governing what Admins, Managers, and Staff can view and mutate.' }
                ].map((t, i) => (
                  <div key={i} className="p-10 border border-white/[0.05] bg-[#0A0A0A] rounded-[2rem] flex flex-col">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mb-8">
                      {t.icon}
                    </div>
                    <h4 className="text-xl text-white font-bold mb-4">{t.title}</h4>
                    <p className="text-gray-400 font-medium leading-relaxed">{t.desc}</p>
                  </div>
                ))}
             </div>
           </div>
        </section>

        {/* Founder Story */}
        <section id="origin" className="py-40 px-6 lg:px-12 max-w-[1000px] mx-auto text-center relative">
           <Spotlight className="top-1/2 -translate-y-1/2 opacity-20" />
           <div className="relative z-10">
             <div className="w-20 h-20 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-12">
               <Store size={32} className="text-[#FF6B00]" />
             </div>
             <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-12 text-white">Built from the pain of running a real kitchen.</h2>
             <div className="text-xl md:text-2xl text-gray-400 font-medium leading-relaxed space-y-8 max-w-4xl mx-auto text-left sm:text-center">
               <p>BhojanOS wasn't dreamt up in a Silicon Valley boardroom. It was forged in a hot, chaotic cloud kitchen.</p>
               <p>We experienced the "tablet hell" of managing multiple delivery aggregators. We felt the margin-crushing pain of guessing tomorrow's prep quantities, and the operational nightmare of finding out we ran out of a critical ingredient mid-service.</p>
               <p>We built internal automation to fix our own problems. Then we added AI to predict demand. Then we realized every food business on earth needs this exact system.</p>
               <p className="text-white font-bold italic pt-4">BhojanOS is the operating system we wish we had on day one.</p>
             </div>
           </div>
        </section>

        {/* Final CTA */}
        <section className="py-40 px-6 lg:px-12 max-w-[1000px] mx-auto text-center relative border-t border-white/[0.05]">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[400px] bg-gradient-to-r from-[#FF6B00]/20 via-transparent to-[#A855F7]/20 blur-[120px] pointer-events-none mix-blend-screen" />
           <h2 className="text-6xl md:text-7xl lg:text-[6rem] font-black tracking-tighter mb-10 text-white relative z-10 leading-[0.95]">
             The Future Of Food Operations Is Autonomous.
           </h2>
           <div className="text-2xl text-gray-400 font-medium mb-16 relative z-10 space-y-3">
             <p>This is not another restaurant software product.</p>
             <p className="text-white font-bold">This is a real AI Operating System.</p>
           </div>
           <div className="flex flex-col sm:flex-row justify-center gap-5 relative z-10 w-full max-w-md mx-auto">
             <GradientButton onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
               Book Demo
             </GradientButton>
             <OutlineButton onClick={() => setStep('services')}>
               Start Free Trial
             </OutlineButton>
           </div>
        </section>

      </main>

      {/* Enterprise Footer */}
      <footer className="border-t border-white/[0.05] bg-[#030303] pt-24 pb-12 relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-20">
            <div className="col-span-2 md:col-span-2">
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
                <li><a href="#" className="hover:text-white transition-colors">Developers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Company</h4>
              <ul className="space-y-4 text-base text-gray-400 font-medium">
                <li><a href="#origin" className="hover:text-white transition-colors">Founder Story</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
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

    </div>
  );
};

export default OnboardKitchen;
