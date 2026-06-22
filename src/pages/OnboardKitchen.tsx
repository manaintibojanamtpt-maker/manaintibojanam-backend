import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Store, User, Phone, Mail, Lock, MessageCircle, ArrowRight, Loader2, 
  Sparkles, CheckCircle2, ShieldCheck, Headset, Users, ShoppingBag, 
  ChevronRight, Building2, Zap, Activity, PieChart, Server,
  Globe, Database, BarChart3, LineChart, TrendingUp, LockKeyhole, ArrowUpRight, Bell, Network
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

// Subtle Spotlight
const Spotlight = ({ className = '' }: { className?: string }) => (
  <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-white/5 blur-[120px] rounded-full pointer-events-none ${className}`} />
);

const GlassCard = ({ children, className = '', onClick, variants }: any) => (
  <motion.div 
    onClick={onClick}
    variants={variants}
    whileHover={onClick ? { scale: 1.02, y: -5 } : {}}
    transition={springTransition}
    className={`bg-white/[0.02] backdrop-blur-3xl border border-white/[0.08] rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${onClick ? 'cursor-pointer hover:bg-white/[0.04] hover:border-white/[0.15] hover:shadow-[0_20px_80px_rgba(255,107,0,0.1)]' : ''} ${className}`}
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

const AnimatedCounter = ({ from, to }: { from: number, to: number }) => {
  const [count, setCount] = useState(from);
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const stepTime = Math.abs(Math.floor(duration / steps));
    let current = from;
    const increment = (to - from) / steps;
    const timer = setInterval(() => {
      current += increment;
      if (current >= to) { clearInterval(timer); setCount(to); }
      else setCount(Math.floor(current));
    }, stepTime);
    return () => clearInterval(timer);
  }, [from, to]);
  return <span>{count.toLocaleString()}</span>;
};

// --- Command Center Mockup ---

const CommandCenterMockup = () => {
  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="relative w-full max-w-4xl mx-auto mt-20 lg:mt-0 perspective-1000"
    >
      {/* Main Backing Card (Intelligence Layer) */}
      <motion.div variants={itemVariant} className="relative z-10 w-full rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_0_120px_rgba(255,107,0,0.1)] bg-[#0A0A0A]/90 backdrop-blur-3xl">
        <div className="h-12 bg-white/[0.02] border-b border-white/[0.05] flex items-center px-6 gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <div className="w-3 h-3 rounded-full bg-white/20" />
          </div>
          <div className="mx-auto px-8 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-gray-500 flex items-center gap-2">
            <LockKeyhole size={10} /> bhojanos.com/owner/command-center
          </div>
        </div>
        <div className="p-8 grid grid-cols-12 gap-6">
          {/* Main Chart Area */}
          <div className="col-span-12 md:col-span-8 space-y-6">
            <div className="flex justify-between items-end">
               <div>
                  <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">AI Revenue Forecast</div>
                  <div className="text-4xl font-black text-white tracking-tighter">₹2,84,500</div>
               </div>
               <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold flex items-center gap-1">
                 <ArrowUpRight size={14}/> 24.5% vs last week
               </div>
            </div>
            {/* Minimalist Chart Bars */}
            <div className="h-48 w-full flex items-end gap-2 sm:gap-3">
              {[30, 45, 35, 60, 50, 85, 70, 95].map((h, i) => (
                <motion.div 
                  key={i} 
                  initial={{ height: 0 }} 
                  animate={{ height: `${h}%` }} 
                  transition={{ delay: 0.8 + (i * 0.1), ...springTransition }}
                  className="flex-1 bg-gradient-to-t from-white/5 to-[#FF6B00]/40 rounded-t-sm relative group"
                >
                   <div className="absolute top-0 w-full h-1 bg-[#FF6B00]" />
                </motion.div>
              ))}
            </div>
          </div>
          {/* Side Widgets */}
          <div className="col-span-12 md:col-span-4 flex flex-col gap-4">
             <div className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 flex flex-col justify-center">
                <Activity size={20} className="text-[#FF4D8D] mb-3" />
                <div className="text-2xl font-bold text-white mb-1">1,204</div>
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Customer Graph</div>
             </div>
             <div className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 flex flex-col justify-center">
                <Store size={20} className="text-[#A855F7] mb-3" />
                <div className="text-2xl font-bold text-white mb-1">4</div>
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Active Nodes</div>
             </div>
          </div>
        </div>
      </motion.div>

      {/* Floating UI Card 1 (Notification) */}
      <motion.div 
        variants={itemVariant}
        className="absolute -right-8 -bottom-8 md:-right-16 md:-bottom-12 z-20 w-72 bg-[#141414]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
      >
         <div className="flex gap-4">
           <div className="w-10 h-10 rounded-full bg-[#FF6B00]/20 flex items-center justify-center shrink-0 border border-[#FF6B00]/30">
             <Bell size={18} className="text-[#FF6B00]" />
           </div>
           <div>
             <div className="text-sm font-bold text-white mb-1">Predictive Supply Alert</div>
             <div className="text-xs text-gray-400 font-medium">Tomato Puree falling below optimal threshold based on weekend forecast.</div>
           </div>
         </div>
      </motion.div>

      {/* Floating UI Card 2 (Active Order) */}
      <motion.div 
        variants={itemVariant}
        className="absolute -left-6 top-16 md:-left-12 md:top-24 z-20 w-64 bg-[#141414]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_40px_rgba(0,0,0,0.6)] hidden sm:block"
      >
         <div className="flex items-center justify-between mb-3">
           <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Commerce Engine</span>
           <span className="text-xs text-[#FF4D8D] font-mono bg-[#FF4D8D]/10 px-2 py-0.5 rounded">#8042</span>
         </div>
         <div className="text-sm font-bold text-white mb-1">Zomato Integration</div>
         <div className="text-xs text-gray-400 font-medium flex justify-between">
           <span>Syncing</span>
           <span className="text-white">₹840</span>
         </div>
         <div className="mt-3 h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: '40%' }} transition={{ delay: 2, duration: 1 }} className="h-full bg-[#FF4D8D]" />
         </div>
      </motion.div>
    </motion.div>
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
            <a href="#category" className="hover:text-white transition-colors">The Category</a>
            <a href="#command-center" className="hover:text-white transition-colors">Command Center</a>
            <a href="#framework" className="hover:text-white transition-colors">Intelligence Loop</a>
            <a href="#enterprise" className="hover:text-white transition-colors">Scale</a>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/owner/login')} className="hidden sm:flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">
               Sign in
            </button>
            <button onClick={() => setStep('services')} className="bg-white text-black hover:bg-gray-200 transition-colors px-6 py-2.5 rounded-full text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)]">
               Initialize Platform
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 overflow-x-hidden pt-20">
        
        {/* Hero Section */}
        <section className="pt-32 pb-40 px-6 lg:px-12 max-w-[1400px] mx-auto min-h-[90vh] flex items-center relative">
          <Spotlight />
          <div className="grid lg:grid-cols-2 gap-20 items-center relative z-10">
            {/* Left */}
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={springTransition} className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest mb-10 text-[#FF6B00] shadow-[0_0_30px_rgba(255,107,0,0.1)]">
                <Sparkles size={14} /> Category Defining
              </div>
              <h1 className="text-7xl md:text-[6.5rem] lg:text-[7rem] font-black tracking-tighter mb-10 leading-[0.95]">
                Launch With <br/> Bhojan<GradientText>OS AI</GradientText>
              </h1>
              <div className="text-2xl text-gray-400 font-medium leading-relaxed mb-14 space-y-3">
                <p className="text-white font-bold">This is not restaurant software.</p>
                <p>This is the AI Operating System for Food Businesses.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-5 max-w-md">
                <GradientButton onClick={() => setStep('services')}>
                  Initialize Your OS <ArrowRight size={18} />
                </GradientButton>
                <OutlineButton onClick={() => document.getElementById('command-center')?.scrollIntoView({behavior:'smooth'})}>
                  Explore The Architecture
                </OutlineButton>
              </div>
            </motion.div>
            
            {/* Right */}
            <CommandCenterMockup />
          </div>
        </section>

        {/* Trust Metrics */}
        <section className="border-y border-white/[0.05] bg-white/[0.01] backdrop-blur-3xl py-12 overflow-hidden">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-80">
             <div className="flex flex-col gap-2">
               <span className="text-4xl font-black text-white"><AnimatedCounter from={0} to={10000} />+</span>
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Nodes</span>
             </div>
             <div className="flex flex-col gap-2">
               <span className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="text-[#FF6B00]" size={20}/> Integrated</span>
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Intelligence Layer</span>
             </div>
             <div className="flex flex-col gap-2">
               <span className="text-xl font-bold text-white flex items-center gap-2"><Server className="text-[#A855F7]" size={20}/> Enterprise</span>
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tenant Isolation</span>
             </div>
             <div className="flex flex-col gap-2">
               <span className="text-xl font-bold text-white flex items-center gap-2"><Activity className="text-[#FF4D8D]" size={20}/> Autonomous</span>
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Commerce Engine</span>
             </div>
          </div>
        </section>

        {/* Category Definition */}
        <section id="category" className="py-40 px-6 lg:px-12 max-w-[1000px] mx-auto text-center relative">
           <Spotlight className="opacity-30" />
           <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={springTransition} className="relative z-10">
             <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-16 text-white">What Is An AI Food Operating System?</h2>
             
             <div className="grid md:grid-cols-2 gap-12 text-left">
               <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-10">
                 <h3 className="text-gray-500 font-bold uppercase tracking-widest text-sm mb-6">Traditional Software</h3>
                 <div className="space-y-6 text-xl font-medium text-gray-400">
                   <p>Manages transactions.</p>
                   <p>Records what happened.</p>
                   <p>A reactive tool requiring constant manual input and supervision.</p>
                 </div>
               </div>
               
               <div className="bg-gradient-to-br from-[#FF6B00]/10 to-[#A855F7]/10 border border-[#FF6B00]/20 rounded-3xl p-10 relative overflow-hidden">
                 <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none" />
                 <h3 className="text-[#FF6B00] font-bold uppercase tracking-widest text-sm mb-6 relative z-10">The BhojanOS Category</h3>
                 <div className="space-y-6 text-xl font-medium text-white relative z-10">
                   <p>Manages decisions.</p>
                   <p>Predicts what happens next.</p>
                   <p>A proactive operating system that runs your kitchen autonomously.</p>
                 </div>
               </div>
             </div>
           </motion.div>
        </section>

        {/* Intelligence Loop */}
        <section id="framework" className="py-40 border-y border-white/[0.05] bg-white/[0.01] relative overflow-hidden">
           <Spotlight className="top-1/2 -translate-y-1/2 opacity-20 mix-blend-screen" />
           <div className="max-w-[1400px] mx-auto px-6 lg:px-12 text-center relative z-10">
             <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6 text-white">The BhojanOS Intelligence Loop</h2>
             <p className="text-xl text-gray-400 font-medium mb-24 max-w-3xl mx-auto">A signature framework designed to continuously optimize your business.</p>
             
             <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-4 relative">
               {/* Line connector for desktop */}
               <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-[#FF6B00]/20 via-[#A855F7]/20 to-[#FF4D8D]/20 -z-10 -translate-y-1/2" />
               
               {[
                 { step: '1', title: 'Capture Demand', desc: 'Ingest signals from all commerce engines.' },
                 { step: '2', title: 'Predict Consumption', desc: 'Forecast precise order volume with AI.' },
                 { step: '3', title: 'Optimize Inventory', desc: 'Deduct and reorder via Predictive Supply.' },
                 { step: '4', title: 'Automate Operations', desc: 'Route tasks instantly via the Command Center.' },
                 { step: '5', title: 'Increase Profitability', desc: 'Eliminate waste and avoid 30% commissions.' }
               ].map((item, i) => (
                 <div key={i} className="flex flex-col items-center flex-1 max-w-[240px] relative group">
                   <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-xl font-black text-white mb-6 relative z-10 shadow-[0_0_30px_rgba(255,255,255,0.05)] group-hover:border-[#FF6B00]/50 group-hover:shadow-[0_0_30px_rgba(255,107,0,0.2)] transition-all duration-300">
                     {item.step}
                   </div>
                   <h4 className="text-lg text-white font-bold mb-2 text-center">{item.title}</h4>
                   <p className="text-sm text-gray-400 font-medium text-center">{item.desc}</p>
                 </div>
               ))}
             </div>
           </div>
        </section>

        {/* AI Command Center */}
        <section id="command-center" className="py-40 px-6 lg:px-12 max-w-[1400px] mx-auto text-center relative">
           <Spotlight className="opacity-50" />
           <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={springTransition}>
             <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-8 text-white">AI Command Center</h2>
             <p className="text-2xl text-gray-400 font-medium max-w-3xl mx-auto mb-24">Everything should feel proactive, not reactive. The OS monitors your kitchen so you don't have to.</p>
           </motion.div>
           
           <div className="relative w-full max-w-5xl mx-auto">
             <div className="grid md:grid-cols-3 gap-8">
                {/* Workflow Card 1 */}
                <motion.div variants={itemVariant} initial="hidden" whileInView="show" viewport={{ once: true }} className="bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-left relative overflow-hidden group">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-8 border border-orange-500/20">
                    <TrendingUp size={24} className="text-orange-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Demand Prediction</h3>
                  <p className="text-gray-400 font-medium">Tomorrow's prep list is automatically generated based on historical trends and weather data.</p>
                  <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-orange-500/20 blur-3xl rounded-full" />
                </motion.div>

                {/* Workflow Card 2 */}
                <motion.div variants={itemVariant} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-left relative overflow-hidden group mt-0 md:mt-12">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-8 border border-purple-500/20">
                    <Activity size={24} className="text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Kitchen Health</h3>
                  <p className="text-gray-400 font-medium">Real-time monitoring of operational latencies and bottleneck prevention alerts.</p>
                  <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full" />
                </motion.div>

                {/* Workflow Card 3 */}
                <motion.div variants={itemVariant} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ delay: 0.2 }} className="bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-left relative overflow-hidden group mt-0 md:mt-24">
                  <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-8 border border-pink-500/20">
                    <Database size={24} className="text-pink-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Inventory Forecasting</h3>
                  <p className="text-gray-400 font-medium">Predictive supply alerts fire before you run out of critical ingredients.</p>
                  <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-pink-500/20 blur-3xl rounded-full" />
                </motion.div>
             </div>
           </div>
        </section>

        {/* Enterprise Readiness */}
        <section id="enterprise" className="py-40 bg-white/[0.02] border-y border-white/[0.05] relative overflow-hidden">
           <Spotlight className="opacity-30 mix-blend-screen" />
           <div className="max-w-[1400px] mx-auto px-6 lg:px-12 grid md:grid-cols-2 gap-24 items-center relative z-10">
             <div>
               <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-8 text-white">Built For One Kitchen. <br/>Ready For One Thousand.</h2>
               <p className="text-2xl text-gray-400 font-medium leading-relaxed mb-12">
                 Scale locations infinitely without upgrading your tech stack. The OS scales with you.
               </p>
               <div className="space-y-10">
                 {[
                   { title: 'Multi-Location Scaling', desc: 'Deploy new kitchen nodes to your network instantly with inherited configurations.' },
                   { title: 'Tenant Isolation', desc: 'Enterprise-grade database isolation ensures your operational data is impenetrable.' },
                   { title: 'Centralized Control', desc: 'Manage menus, prices, and predictive models across 1,000 locations from one Command Center.' }
                 ].map((item, i) => (
                   <div key={i} className="flex gap-6">
                     <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1 border border-white/20">
                       <Network size={16} className="text-[#FF6B00]" />
                     </div>
                     <div>
                       <h4 className="text-2xl font-bold text-white mb-3">{item.title}</h4>
                       <p className="text-gray-400 font-medium text-lg leading-relaxed">{item.desc}</p>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
             <div className="relative flex justify-center">
                <div className="aspect-square w-full max-w-md bg-black/50 backdrop-blur-2xl border border-white/[0.08] rounded-[3rem] p-12 flex flex-col justify-center relative overflow-hidden shadow-[0_0_120px_rgba(168,85,247,0.15)]">
                   <div className="absolute inset-0 bg-gradient-to-br from-[#A855F7]/20 to-transparent mix-blend-screen pointer-events-none" />
                   <div className="text-center z-10">
                     <Server size={80} className="text-white/80 mx-auto mb-10" strokeWidth={1} />
                     <div className="text-5xl font-black text-white mb-4 tracking-tighter">Unified Operations</div>
                     <div className="text-gray-400 font-bold tracking-widest uppercase text-sm">One Central Brain</div>
                   </div>
                </div>
             </div>
           </div>
        </section>

        {/* Founder Story */}
        <section id="origin" className="py-40 px-6 lg:px-12 max-w-[1000px] mx-auto text-center relative">
           <Spotlight className="top-1/2 -translate-y-1/2 opacity-20" />
           <div className="relative z-10">
             <div className="w-20 h-20 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-12">
               <Store size={32} className="text-gray-400" />
             </div>
             <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-12 text-white">Built By Someone Who Ran A Kitchen.</h2>
             <div className="text-xl md:text-2xl text-gray-400 font-medium leading-relaxed space-y-8 max-w-4xl mx-auto text-left sm:text-center">
               <p>BhojanOS was not created by software consultants.</p>
               <p>It was built from the excruciating operational pain experienced while running a real food business.</p>
               <p>Managing orders across five tablets. Blind inventory tracking. Late deliveries. Demanding customer expectations.</p>
               <p className="text-white font-bold italic pt-4">The OS exists because food businesses deserve an intelligence layer that actually understands kitchen operations.</p>
             </div>
           </div>
        </section>

        {/* Future Vision (Closing) */}
        <section className="py-40 px-6 lg:px-12 max-w-[1000px] mx-auto text-center relative border-t border-white/[0.05]">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[400px] bg-gradient-to-r from-[#FF6B00]/20 via-transparent to-[#A855F7]/20 blur-[120px] pointer-events-none mix-blend-screen" />
           <h2 className="text-6xl md:text-7xl lg:text-[6rem] font-black tracking-tighter mb-10 text-white relative z-10 leading-[0.95]">
             The Future Of Food Operations Is Autonomous.
           </h2>
           <div className="text-2xl text-gray-400 font-medium mb-16 relative z-10 space-y-3">
             <p>Today, businesses use software.</p>
             <p className="text-white font-bold">Tomorrow, software helps run the business.</p>
             <p className="pt-6">BhojanOS is building that future.</p>
           </div>
           <div className="flex justify-center relative z-10 w-full max-w-md mx-auto">
             <GradientButton onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="py-6 text-xl">
               Initialize Your OS
             </GradientButton>
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
                <li><a href="#framework" className="hover:text-white transition-colors">Intelligence Loop</a></li>
                <li><a href="#enterprise" className="hover:text-white transition-colors">Enterprise Scaling</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Resources</h4>
              <ul className="space-y-4 text-base text-gray-400 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Developers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
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
