import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Store, ShoppingBag, Settings, LogOut, BarChart3, Users, Menu as MenuIcon, Copy, ExternalLink, CheckCircle2, Bell, ChevronRight, X, LayoutDashboard, Rocket, BrainCircuit, BookOpen, AlertCircle, Crown, Gift, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { m, AnimatePresence } from 'framer-motion';
import { useOrderAlerts } from '../../hooks/useOrderAlerts';
import { useEntitlements } from '../../hooks/useEntitlements';
import { useTenant } from '../../context/TenantContext';
import { sendEmailVerification } from 'firebase/auth';
import toast from 'react-hot-toast';
import { EnvironmentConfig } from '../../config/environment';

const OwnerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, logout } = useAuth();
  const { tenantInfo } = useTenant();
  useOrderAlerts();
  const navigate = useNavigate();
  const location = useLocation();
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const entitlements = useEntitlements();

  const handleResendEmail = async () => {
    if (!currentUser || sendingEmail) return;
    setSendingEmail(true);
    try {
      await sendEmailVerification(currentUser);
      toast.success('Verification email sent! Check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const navItems = [
    { name: 'Command Center', path: '/owner/dashboard', icon: LayoutDashboard },
    { name: 'Commerce Engine', path: '/owner/orders', icon: ShoppingBag },
    { name: 'My Customers', path: '/owner/customers', icon: Users, disabled: !entitlements.features.customerInsights },
    { name: 'Compliance & KYC', path: '/owner/kyc', icon: CheckCircle2 },
    { name: 'Stock Alerts', path: '/owner/recipes', icon: BookOpen, disabled: !entitlements.features.predictiveSupply },
    { name: 'Menu Engine', path: '/owner/menu', icon: MenuIcon, hideOnMobile: true },
    { name: 'Ways to Increase Sales', path: '/owner/marketing', icon: BrainCircuit, hideOnMobile: true, disabled: !entitlements.features.marketing },
    { name: 'Delivery Intel', path: '/owner/delivery', icon: Rocket, hideOnMobile: true, disabled: !entitlements.features.deliveryIntelligence },
    { name: 'Storefront Settings', path: '/owner/settings', icon: Settings },
    { name: 'Plans & Billing', path: '/owner/subscription', icon: Crown, hideOnMobile: true },
    { name: 'Refer & Earn', path: '/owner/referrals', icon: Gift, hideOnMobile: false },
    { name: 'Help & Feedback', path: '/owner/feedback', icon: MessageCircle, hideOnMobile: false }
  ].filter(item => !item.disabled); // Completely hide them if disabled, or you can gray them out. Let's gray them out.

  const tenantId = userProfile?.ownedTenantIds?.[0];
  const storeUrl = tenantId ? EnvironmentConfig.getStorefrontUrl(tenantId) : '';
  const currentPage = navItems.find(item => item.path === location.pathname)?.name || location.pathname.split('/').pop() || 'Dashboard';

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const copyStoreLink = () => {
    if (!storeUrl) return;
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goTo = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-[100dvh] bg-[#0a0a0a] text-white overflow-hidden font-sans">
      
      {/* SaaS Sidebar */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 border-r border-white/10 bg-[#0f0f11] flex-col relative z-20">
        
        {/* Top Branding */}
        <div className="h-20 flex items-center px-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20 mr-3">
            <Store size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-black text-lg tracking-tight leading-none">BhojanOS</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-1">Tenant Portal</p>
          </div>
        </div>

        {/* User Profile Snippet */}
        <div className="p-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center space-x-4 shadow-inner">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-bold border border-red-500/30">
              {userProfile?.name?.charAt(0) || 'O'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-white">{userProfile?.name || 'Owner'}</p>
              <p className="text-xs text-white/50 truncate">{userProfile?.email || 'Admin'}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 mt-2 overflow-y-auto no-scrollbar">
          <div className="px-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Menu</span>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.name}
                onClick={() => !item.disabled && navigate(item.path)}
                disabled={item.disabled}
                className={`w-full flex items-center px-4 py-3 rounded-xl transition-all group relative ${
                  isActive 
                    ? 'bg-gradient-to-r from-red-600/10 to-transparent text-red-500' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                } ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {isActive && (
                  <m.div 
                    layoutId="ownerSidebarActive"
                    className="absolute left-0 w-1 h-6 bg-red-500 rounded-r-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
                <Icon size={18} className={`mr-4 ${isActive ? 'text-red-500' : 'text-white/40 group-hover:text-white/80'}`} />
                <span className="font-semibold text-sm tracking-wide">{item.name}</span>
                {item.disabled && (
                  <span className="ml-auto text-[9px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full">Pro</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/5 space-y-3">
          {tenantId && (
            <div className="bg-[#151515] border border-white/10 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Store Link</p>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={copyStoreLink}
                  className="flex-1 flex items-center justify-center bg-[#222] hover:bg-[#2a2a2a] py-2 px-3 rounded-lg text-xs font-semibold transition-colors"
                >
                  {copied ? <CheckCircle2 size={14} className="text-emerald-500 mr-2" /> : <Copy size={14} className="text-white/60 mr-2" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <a 
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-red-600/10 hover:bg-red-600/20 text-red-500 py-2 px-3 rounded-lg text-xs font-bold transition-colors"
                >
                  <ExternalLink size={14} className="mr-1.5" />
                  Visit
                </a>
              </div>
            </div>
          )}

          <button 
            onClick={logout}
            className="w-full flex items-center px-4 py-3 text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-semibold text-sm"
          >
            <LogOut size={18} className="mr-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <m.button
              type="button"
              aria-label="Close owner menu"
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <m.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-sm flex-col border-r border-white/10 bg-[#0f0f11] shadow-2xl lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            >
              <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600 to-orange-500 shadow-lg shadow-red-500/20">
                    <Store size={18} className="text-white" />
                  </div>
                  <div>
                    <h1 className="font-black leading-none tracking-tight">BhojanOS</h1>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">Tenant Portal</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-500/30 bg-red-500/20 font-bold text-red-500">
                    {userProfile?.name?.charAt(0) || 'O'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{userProfile?.name || 'Owner'}</p>
                    <p className="truncate text-xs text-white/50">{userProfile?.email || 'Admin'}</p>
                  </div>
                </div>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto px-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => !item.disabled && goTo(item.path)}
                      disabled={item.disabled}
                      className={`flex w-full items-center rounded-2xl px-4 py-3 text-left transition-all ${
                        isActive
                          ? 'bg-red-600/15 text-red-400'
                          : 'text-white/65 hover:bg-white/5 hover:text-white'
                      } ${item.disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                    >
                      <Icon size={18} className="mr-4" />
                      <span className="text-sm font-bold">{item.name}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="space-y-3 border-t border-white/5 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {tenantId && (
                  <div className="rounded-2xl border border-white/10 bg-[#151515] p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">Store Link</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={copyStoreLink}
                        className="flex flex-1 items-center justify-center rounded-xl bg-[#222] px-3 py-3 text-xs font-semibold"
                      >
                        {copied ? <CheckCircle2 size={14} className="mr-2 text-emerald-500" /> : <Copy size={14} className="mr-2 text-white/60" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                      <a
                        href={storeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center rounded-xl bg-red-600/10 px-3 py-3 text-xs font-bold text-red-500"
                      >
                        <ExternalLink size={14} className="mr-1.5" />
                        Visit
                      </a>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400"
                >
                  <LogOut size={18} className="mr-4" />
                  Sign Out
                </button>
              </div>
            </m.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#050505] relative z-10 h-[100dvh] overflow-hidden">
        
        {/* Topbar */}
        <header 
          style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
          className="pb-3 px-3 sm:px-4 md:px-8 flex items-center justify-between border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-md flex-shrink-0 relative z-20"
        >
          <div className="flex min-w-0 items-center gap-2 text-white/50 text-sm font-bold">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="mr-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 lg:hidden hover:bg-white/10 transition-colors"
              aria-label="Open owner menu"
            >
              <MenuIcon size={18} />
            </button>
            <span className="hidden lg:inline text-white/40">BhojanOS</span>
            <ChevronRight size={14} className="hidden lg:block text-white/20" />
            <span className="truncate text-white capitalize text-lg tracking-tight drop-shadow-sm">{currentPage}</span>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </button>
            <button onClick={logout} className="hidden sm:flex lg:hidden w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 items-center justify-center text-red-500 hover:text-red-400 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Email Verification Banner */}
        {(!currentUser?.emailVerified && tenantInfo?.kyc?.emailVerificationStatus !== 'verified') && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 relative z-10">
            <div className="flex items-start sm:items-center gap-3">
              <AlertCircle size={18} className="text-rose-500 mt-0.5 sm:mt-0 shrink-0" />
              <div>
                <p className="text-sm font-bold text-rose-400">Verify your email to unlock Live Publishing.</p>
                <p className="text-xs text-rose-400/70 mt-0.5">You can test your store in Sandbox Mode, but you cannot publish to Live or activate premium plans until your email is verified.</p>
              </div>
            </div>
            <button 
              onClick={handleResendEmail}
              disabled={sendingEmail}
              className="text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {sendingEmail ? 'Sending...' : 'Resend Email'}
            </button>
          </div>
        )}

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto w-full pb-28 lg:pb-20">
            {children}
          </div>
        </div>

        <nav 
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
          className="fixed inset-x-4 bottom-4 z-30 rounded-[2rem] border border-white/10 bg-[#141416]/80 px-2 pt-2 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl lg:hidden"
        >
          <div className="grid grid-cols-5 gap-1">
            {navItems.filter(item => !item.hideOnMobile).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => !item.disabled && goTo(item.path)}
                  disabled={item.disabled}
                  className={`flex min-w-0 flex-col items-center justify-center rounded-[1.5rem] px-1 py-2 text-[10px] font-bold transition-all ${
                    isActive ? 'bg-red-500/10 text-red-500 scale-105' : 'text-white/40 hover:text-white/70'
                  } ${item.disabled ? 'opacity-40' : ''}`}
                >
                  <Icon size={isActive ? 22 : 20} className={`mb-1 transition-all ${isActive ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : ''}`} />
                  <span className="w-full truncate text-center tracking-tight">{item.name.replace('Storefront ', '')}</span>
                </button>
              );
            })}
          </div>
        </nav>

      </main>

    </div>
  );
};

export default OwnerLayout;
