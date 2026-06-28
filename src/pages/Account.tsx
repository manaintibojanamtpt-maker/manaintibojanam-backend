import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStorefrontAuth } from '../hooks/useStorefrontAuth';
import { useStorefrontPath } from '../hooks/useStorefrontPath';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, LogOut, ChevronRight, MapPin, LayoutDashboard, Utensils, Heart, HelpCircle, CreditCard, Sparkles, X, Mail, Phone, Edit2, CheckCircle2, User, MessageCircle, Activity } from 'lucide-react';
import { EnvironmentConfig } from '../config/environment';
import { m, AnimatePresence, Variants } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { useBiometrics } from '../hooks/useBiometrics';
import { Fingerprint } from 'lucide-react';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../utils/haptics';
import { useTenant } from '../context/TenantContext';

const Account: React.FC = () => {
  const { currentUser, userProfile, logout, isCustomerPreview } = useStorefrontAuth();
  const { loginPath } = useStorefrontPath();
  const { isSupported: bioSupported, isEnabled: bioEnabled, enroll: bioEnroll, disable: bioDisable, biometryType, enrollLoading, disableLoading } = useBiometrics();
  const navigate = useNavigate();
  const { tenantSlug, tenantInfo } = useTenant();
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Edit Profile State
  const [editName, setEditName] = useState(userProfile?.name || '');
  const [editPhone, setEditPhone] = useState(userProfile?.phone || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate(loginPath('/account'), { replace: true });
    }
  }, [currentUser, loginPath, navigate]);

  useEffect(() => {
    if (currentUser) {
      // Wake up backend to avoid cold-start delays on Render
      fetch(`${EnvironmentConfig.getApiUrl()}/api/health`).catch(() => {});
    }
  }, [currentUser]);

  useEffect(() => {
    if (userProfile && activeModal !== 'edit') {
      setEditName(userProfile.name || '');
      setEditPhone(userProfile.phone || '');
    }
  }, [userProfile, activeModal]);

  const handleLogout = async () => {
    await logout();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (currentUser.uid) {
        await updateDoc(doc(getDb(), "users", currentUser.uid), {
          name: editName,
          phone: editPhone
        });
        setTimeout(() => {
          setActiveModal(null);
          setIsSaving(false);
        }, 500);
      }
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const modalVariants: Variants = {
    hidden: { y: "100%" },
    visible: { y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } },
    exit: { y: "100%", transition: { type: "spring", stiffness: 300, damping: 25 } }
  };

  const name = userProfile?.name || 'User';
  const initial = name.charAt(0).toUpperCase();

  const BottomSheet = ({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) => {
    const content = (
      <>
        <m.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
        />
        <m.div 
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={(e, info) => {
            if (info.offset.y > 100 || info.velocity.y > 500) {
              onClose();
            }
          }}
          className="fixed inset-x-0 bottom-0 z-[100] bg-dark-bg/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[2.5rem] shadow-[0_-20px_40px_rgba(0,0,0,0.5)] pt-4 pb-[calc(2rem+env(safe-area-inset-bottom))] px-6 max-h-[85vh] overflow-y-auto no-scrollbar"
        >
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black tracking-tight">{title}</h2>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors active:scale-95">
              <X size={20} className="text-white/60" />
            </button>
          </div>
          {children}
        </m.div>
      </>
    );
    return typeof document !== 'undefined' ? createPortal(content, document.body) : <>{content}</>;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white pb-[calc(2rem+env(safe-area-inset-bottom))]">
      {/* Premium Sticky Header */}
      <div className="sticky top-0 z-40 bg-dark-bg/85 backdrop-blur-2xl border-b border-white/5 px-6 py-4" style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-black tracking-tight">Profile</h1>
        </div>
      </div>

      <m.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="px-4 sm:px-6 pt-6 max-w-2xl mx-auto"
      >
        {/* Immersive Hero Section */}
        <m.div variants={itemVariants} className="relative mb-10">
          <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/20 to-amber-400/10 blur-3xl rounded-[3rem] -z-10" />
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-full flex items-center justify-center text-white font-black text-3xl shadow-[0_8px_32px_-8px_rgba(255,107,53,0.6)]">
                {currentUser ? initial : <User size={32} className="text-white" />}
              </div>
              {currentUser && (
                <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-[3px] border-dark-bg flex items-center justify-center">
                  <Sparkles size={10} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black tracking-tight">{currentUser ? name : 'Guest'}</h2>
              <p className="text-sm font-medium text-white/50">
                {currentUser ? (userProfile?.phone || currentUser?.email) : 'Sign in to save your progress'}
              </p>
              {currentUser ? (
                <button 
                  onClick={() => setActiveModal('edit')}
                  className="mt-2 text-[11px] font-black uppercase tracking-wider text-orange-400 flex items-center gap-1 active:scale-95 transition-transform"
                >
                  Edit Profile <ChevronRight size={12} />
                </button>
              ) : (
                <button 
                  onClick={() => navigate(tenantSlug ? `/k/${tenantSlug}/login` : '/login')}
                  className="mt-2 text-[11px] font-black uppercase tracking-wider text-orange-400 flex items-center gap-1 active:scale-95 transition-transform"
                >
                  Sign In <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>
        </m.div>

        {/* BHOJAN LOYALTY WALLET */}
        {currentUser && (
          <m.div variants={itemVariants} className="mb-10">
            <div className="bg-gradient-to-br from-[#1a1a1f] to-[#141418] rounded-3xl p-6 border border-white/5 relative overflow-hidden shadow-xl">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <Sparkles size={14} className="text-purple-400" />
                  </div>
                  <h3 className="font-bold text-white tracking-wide">Bhojan<span className="text-purple-400">Points</span></h3>
                </div>
                <div className="bg-white/5 px-3 py-1 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70">
                  Tier: {userProfile?.rewardTier || 'Bronze'}
                </div>
              </div>

              <div className="flex items-end gap-2 mb-6 relative z-10">
                <span className="text-5xl font-black text-white tracking-tighter">{userProfile?.bhojanPoints || 0}</span>
                <span className="text-sm font-bold text-white/40 pb-1 uppercase tracking-widest">Pts</span>
              </div>

              <div className="grid grid-cols-2 gap-3 relative z-10">
                <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors active:scale-95 flex items-center justify-center gap-2">
                  <ShoppingBag size={14} /> Redeem
                </button>
                <button className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors active:scale-95 flex items-center justify-center gap-2">
                  <Activity size={14} /> History
                </button>
              </div>
            </div>
          </m.div>
        )}

        {/* ORDERS */}
        {currentUser && (
          <m.div variants={itemVariants} className="mb-6">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 px-2">Food Orders</h3>
          <div className="bg-white/5 rounded-[1.75rem] border border-white/10 overflow-hidden backdrop-blur-md">
            <Link to="/my-orders" className="flex items-center gap-4 p-4 active:bg-white/10 transition-colors">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/15 flex items-center justify-center text-orange-400">
                <ShoppingBag size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold">Your Orders</p>
                <p className="text-[11px] font-medium text-white/40">Past orders & reordering</p>
              </div>
              <ChevronRight size={18} className="text-white/20" />
            </Link>
            <div className="h-px bg-white/5 ml-[4.5rem]" />
            <Link to="/subscription" className="flex items-center gap-4 p-4 active:bg-white/10 transition-colors">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                <Utensils size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold">Meal Subscriptions</p>
                <p className="text-[11px] font-medium text-white/40">Manage daily plans</p>
              </div>
              <ChevronRight size={18} className="text-white/20" />
            </Link>
          </div>
        </m.div>
        )}

        {/* ACCOUNT */}
        {currentUser && (
        <m.div variants={itemVariants} className="mb-6">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 px-2">Account Settings</h3>
          <div className="bg-white/5 rounded-[1.75rem] border border-white/10 overflow-hidden backdrop-blur-md">
            <Link to="/addresses" className="flex items-center gap-4 p-4 active:bg-white/10 transition-colors">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                <MapPin size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold">Saved Addresses</p>
              </div>
              <ChevronRight size={18} className="text-white/20" />
            </Link>
            <div className="h-px bg-white/5 ml-[4.5rem]" />
            <div onClick={() => setActiveModal('payments')} className="flex items-center gap-4 p-4 active:bg-white/10 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                <CreditCard size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold">Payment Methods</p>
              </div>
              <ChevronRight size={18} className="text-white/20" />
            </div>

            {bioSupported && (
              <>
                <div className="h-px bg-white/5 ml-[4.5rem]" />
                <div className="flex items-center gap-4 p-4 active:bg-white/10 transition-colors">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
                    bioEnabled ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-white/40"
                  )}>
                    <Fingerprint size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[15px]">{biometryType === 'Passkey' ? 'Passkey Unlock' : `${biometryType || 'Biometric'} Unlock`}</p>
                    <p className="text-[11px] font-medium text-white/40 leading-tight mt-0.5">
                      {bioEnabled 
                        ? 'Authenticated with device biometrics' 
                        : `Enable ${(biometryType?.toString() || 'biometrics').toLowerCase()} for faster login`
                      }
                    </p>
                  </div>
                  <button 
                    disabled={enrollLoading || disableLoading}
                    onClick={async () => {
                      triggerHaptic('medium');
                      try {
                        if (bioEnabled) {
                          await bioDisable();
                        } else {
                          await bioEnroll();
                        }
                      } catch (err) {
                        console.error('Toggle error:', err);
                      }
                    }}
                    className={cn(
                      "relative w-12 h-6 rounded-full transition-all duration-300",
                      bioEnabled ? "bg-orange-500" : "bg-white/10",
                      (enrollLoading || disableLoading) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {(enrollLoading || disableLoading) ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg transition-all duration-300 flex items-center justify-center",
                        bioEnabled ? "left-7" : "left-1"
                      )}>
                        {bioEnabled && <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                      </div>
                    )}
                  </button>
                </div>
                {!bioEnabled && (
                  <div className="mx-4 mb-4 p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                    <p className="text-[10px] text-white/40 font-medium leading-relaxed">
                      <span className="text-orange-400/80 font-bold uppercase tracking-wider mr-1">Note:</span> 
                      If you've added this app to your Home Screen, you'll need to enable biometrics once here for this device's security enclave.
                    </p>
                  </div>
                )}
              </>
            )}
            
            {userProfile?.role === 'admin' && (
              <>
                <div className="h-px bg-white/5 ml-[4.5rem]" />
                <Link to="/admin" className="flex items-center gap-4 p-4 active:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/15 flex items-center justify-center text-red-400">
                    <LayoutDashboard size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">Admin Dashboard</p>
                  </div>
                  <ChevronRight size={18} className="text-white/20" />
                </Link>
              </>
            )}
          </div>
        </m.div>
        )}

        {/* SUPPORT */}
        <m.div variants={itemVariants} className="mb-8">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 px-2">Support & More</h3>
          <div className="bg-white/5 rounded-[1.75rem] border border-white/10 overflow-hidden backdrop-blur-md">
            <div onClick={() => setActiveModal('support')} className="flex items-center gap-4 p-4 active:bg-white/10 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 flex items-center justify-center text-sky-400">
                <HelpCircle size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold">Help & Support</p>
              </div>
              <ChevronRight size={18} className="text-white/20" />
            </div>
            <div className="h-px bg-white/5 ml-[4.5rem]" />
            <div onClick={() => setActiveModal('about')} className="flex items-center gap-4 p-4 active:bg-white/10 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-400">
                <Heart size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold">About BhojanOS</p>
              </div>
              <ChevronRight size={18} className="text-white/20" />
            </div>
          </div>
        </m.div>

        {/* ACTION */}
        <m.div variants={itemVariants}>
          {currentUser ? (
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-[1.5rem] bg-white/5 border border-white/10 text-red-400 font-bold active:bg-red-500/10 active:border-red-500/30 transition-all active:scale-[0.98]"
            >
              <LogOut size={18} />
              Log Out
            </button>
          ) : (
            <button 
              onClick={() => navigate(tenantSlug ? `/k/${tenantSlug}/login` : '/login')}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-[1.5rem] bg-orange-500 text-white font-bold shadow-lg shadow-orange-500/20 active:bg-orange-600 transition-all active:scale-[0.98]"
            >
              <User size={18} />
              Sign In to Continue
            </button>
          )}
          
          <p className="text-center mt-6 text-[10px] font-bold tracking-widest uppercase text-white/20">
            App Version 2.0.0
          </p>
        </m.div>

      </m.div>

      {/* MODALS */}
      <AnimatePresence>
        {activeModal === 'edit' && (
          <BottomSheet title="Edit Profile" onClose={() => setActiveModal(null)}>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-white/50 ml-4">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-white/20"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-white/50 ml-4">Phone Number</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-white/20"
                    placeholder="Enter mobile number"
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <span className="animate-pulse">Saving...</span>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </BottomSheet>
        )}

        {activeModal === 'payments' && (
          <BottomSheet title="Payment Methods" onClose={() => setActiveModal(null)}>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-24 h-24 bg-gradient-to-tr from-amber-500/20 to-orange-500/10 rounded-full flex items-center justify-center mb-6">
                <CreditCard size={40} className="text-amber-400" />
              </div>
              <h3 className="text-xl font-black mb-2">Coming Soon</h3>
              <p className="text-sm text-white/50 max-w-[250px]">
                We are working on bringing you saved cards, UPI options, and digital wallets for faster checkouts.
              </p>
              <button 
                onClick={() => setActiveModal(null)}
                className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/15 rounded-xl font-bold transition-all active:scale-95"
              >
                Got It
              </button>
            </div>
          </BottomSheet>
        )}

        {activeModal === 'support' && (
          <BottomSheet title="Help & Support" onClose={() => setActiveModal(null)}>
            <p className="text-sm text-white/60 mb-6">
              Need help with your order or have a question? Reach out to us anytime!
            </p>
            <div className="space-y-4">
              <a 
                href={tenantInfo?.contactPhone ? `https://wa.me/${tenantInfo.contactPhone.replace(/\D/g, '')}` : '#'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 p-5 bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/20 rounded-[1.5rem] transition-all active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-[#25D366]/20 text-[#25D366] rounded-2xl flex items-center justify-center">
                  <MessageCircle size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-[#25D366]">Chat on WhatsApp</h4>
                  <p className="text-xs text-white/50 mt-1">Fastest response</p>
                </div>
              </a>
              <a 
                href="mailto:manaintibojanamtpt@gmail.com"
                className="flex items-center gap-4 p-5 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 rounded-[1.5rem] transition-all active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center">
                  <Mail size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-blue-400">Email Us</h4>
                  <p className="text-xs text-white/50 mt-1">manaintibojanamtpt@gmail.com</p>
                </div>
              </a>
            </div>
          </BottomSheet>
        )}

        {activeModal === 'about' && (
          <BottomSheet title="About Us" onClose={() => setActiveModal(null)}>
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-full flex items-center justify-center mb-4 shadow-[0_8px_32px_-8px_rgba(255,107,53,0.6)]">
                <Utensils size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
                BhojanOS
              </h3>
            </div>
            
            <div className="space-y-6 text-[15px] leading-relaxed text-white/80 pb-6">
              <p>
                Welcome to <strong className="text-white">BhojanOS</strong> — your trusted source for authentic, home-cooked Andhra-style meals. 
              </p>
              <div className="p-5 rounded-[1.5rem] bg-orange-500/10 border border-orange-500/20">
                <p className="italic text-orange-200">
                  "We believe that nothing beats the warmth, comfort, and safety of a meal prepared just like you would at home."
                </p>
              </div>
              <p>
                Our mission is to bring you fresh, hygienic, and highly nutritious daily meals crafted with premium ingredients, pure ghee, and the authentic spices of our heritage.
              </p>
              <p>
                Whether you're craving a traditional Thali, a quick bite, or subscribing for daily home-cooked deliveries, we ensure every dish is crafted with love.
              </p>
            </div>
          </BottomSheet>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Account;
