import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Menu as MenuIcon, X, ChevronDown, LayoutDashboard, ShoppingBag, Sun, Moon, MapPin, Utensils, Mail, Phone, ChevronRight, MessageCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { m, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';

import { isStoreOpenNow, getClosingSoonStatus } from '../lib/storeUtils';

import logo from '../assets/logo.webp';

const Navbar: React.FC = () => {
  const { cart, total } = useCart();
  const { currentUser, userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { tenantSlug, tenantInfo } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(getDb(), "adminSettings", "global"), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data());
      }
    });
    return () => unsubscribe();
  }, []);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const isStoreOpen = isStoreOpenNow(settings, currentTime);
  const closingSoon = getClosingSoonStatus(settings, currentTime);

  // Close menus on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location]);

  const handleLogout = async () => {
    await logout();
    navigate(tenantSlug ? `/k/${tenantSlug}` : '/');
  };

  const isHome = location.pathname === '/';

  const storeName = tenantInfo?.name || 'MANA INTI';
  const hasCustomLogo = !!tenantInfo?.branding?.logoUrl;
  const isDefaultStore = !tenantSlug || tenantSlug === 'mana-inti' || storeName === 'MANA INTI';

  const renderBranding = (isMobile = false) => {
    if (hasCustomLogo) {
      return (
        <div className="flex items-center gap-2 md:gap-3 group">
          <div className="w-8 h-8 md:w-10 md:h-10 overflow-hidden rounded-xl shadow-lg group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 bg-white p-1 border border-gray-100 dark:border-white/10">
            <img src={tenantInfo!.branding!.logoUrl} alt={storeName} className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className={`font-black ${isMobile ? 'text-lg text-gray-900 dark:text-white' : 'text-sm md:text-base'} leading-none tracking-tight drop-shadow-sm transition-colors duration-500 ${!isMobile && (isScrolled || !isHome) ? 'text-gray-900 dark:text-white' : !isMobile ? 'text-gray-900 md:text-white' : ''}`}>
              {storeName}
            </span>
          </div>
        </div>
      );
    }
    
    if (isDefaultStore) {
      return (
        <div className="flex items-center gap-2 md:gap-3 group">
          <div className="w-8 h-8 md:w-10 md:h-10 overflow-hidden rounded-xl shadow-lg group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 bg-white p-1 border border-gray-100 dark:border-white/10">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className={`font-bold ${isMobile ? 'text-lg text-gray-900 dark:text-white' : 'text-sm md:text-base'} leading-none tracking-tight drop-shadow-sm transition-colors duration-500 ${!isMobile && (isScrolled || !isHome) ? 'text-gray-900 dark:text-white' : !isMobile ? 'text-gray-900 md:text-white' : ''}`}>
              MANA INTI
            </span>
            <span className={`font-bold text-[7px] md:text-[8px] leading-none tracking-[0.2em] uppercase drop-shadow-sm transition-colors duration-500 ${!isMobile && (isScrolled || !isHome) ? 'text-red-600' : !isMobile ? 'text-red-600 md:text-red-400' : 'text-red-600'}`}>
              Bojanam
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 md:gap-3 group">
        <div className="flex flex-col">
          <span className={`font-serif italic font-black ${isMobile ? 'text-xl text-gray-900 dark:text-white' : 'text-lg md:text-xl'} leading-none tracking-tight drop-shadow-sm transition-colors duration-500 ${!isMobile && (isScrolled || !isHome) ? 'text-gray-900 dark:text-white' : !isMobile ? 'text-gray-900 md:text-white' : ''}`}>
            {storeName}
          </span>
          <span className={`font-bold text-[6px] md:text-[7px] leading-none tracking-[0.3em] uppercase drop-shadow-sm transition-colors duration-500 ${!isMobile && (isScrolled || !isHome) ? 'text-red-600' : !isMobile ? 'text-red-600 md:text-red-400' : 'text-red-600'}`}>
            Premium Kitchen
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col ${
          isScrolled || !isHome 
            ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-lg shadow-black/5 border-b border-gray-100 dark:border-gray-800' 
            : 'bg-transparent'
        }`}
      >
      <AnimatePresence>
        {!isStoreOpen && (
          <m.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-600 text-white py-2.5 px-6 text-center font-black uppercase tracking-[0.25em] text-[10px] md:text-[11px] flex items-center justify-center gap-3 shadow-lg shadow-red-600/20 z-[60]"
          >
            <span className="w-2 h-2 bg-white rounded-full animate-pulse shadow-sm" />
            Currently not accepting orders. Please check back later! 🕒
          </m.div>
        )}
        {isStoreOpen && closingSoon && (
          <m.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-600 text-white py-2.5 px-6 text-center font-black uppercase tracking-[0.25em] text-[10px] md:text-[11px] flex items-center justify-center gap-3 shadow-lg shadow-red-600/20 z-[60]"
          >
            <span className="w-2 h-2 bg-white rounded-full animate-pulse shadow-sm" />
            Hurry! We're closing in less than 30 minutes! 🏃‍♂️💨
          </m.div>
        )}
      </AnimatePresence>

      <div className={`flex items-center w-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${isScrolled ? 'h-[44px] md:h-[56px]' : 'h-[50px] md:h-[68px]'}`}>
        <div className="w-full px-3 md:px-6 flex justify-between items-center">
          
          {/* LOGO & LOCATION */}
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/" className="flex items-center">
              {renderBranding(false)}
            </Link>

            {isHome && (
              <div 
                className={`flex items-center gap-2 pl-3 md:pl-4 border-l transition-all hover:opacity-100 group ${isScrolled || !isHome ? 'border-gray-100 dark:border-white/5' : 'border-white/10'}`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-12 ${isScrolled || !isHome ? 'bg-red-50 text-red-600 shadow-inner' : 'bg-white/10 text-white backdrop-blur-md'}`}>
                  <MapPin size={14} />
                </div>
                <div className="flex flex-col items-start">
                  <span className={`text-[7px] font-black uppercase tracking-[0.15em] opacity-60 mb-0.5 ${isScrolled || !isHome ? 'text-gray-500 dark:text-gray-400' : 'text-white'}`}>
                    Serving In
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${isScrolled || !isHome ? 'text-gray-900 dark:text-white' : 'text-white'}`}>
                    Manjari Bk, Pune
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* DESKTOP NAV */}
          <div className="hidden md:flex items-center gap-4">
            <NavLink to="/" label="Home" active={location.pathname === '/'} light={!isScrolled && isHome} />
            <NavLink to="/menu" label="Menu" active={location.pathname === '/menu'} light={!isScrolled && isHome} />
            
            <div className={`h-5 w-px transition-colors duration-500 ${isScrolled || !isHome ? 'bg-gray-200 dark:bg-white/10' : 'bg-white/20'}`}></div>

            {/* THEME TOGGLE */}
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all hover:scale-110 active:scale-90 group drop-shadow-sm ${
                isScrolled || !isHome 
                  ? 'text-gray-900 dark:text-white hover:bg-red-50 dark:hover:bg-white/5' 
                  : 'text-white hover:bg-white/10 backdrop-blur-md'
              }`}
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={18} className="group-hover:rotate-12 transition-transform" /> : <Sun size={18} className="group-hover:rotate-90 transition-transform" />}
            </button>

            {/* CART */}
            <Link 
              to="/checkout" 
              className={`relative p-2 rounded-xl transition-all hover:scale-110 active:scale-90 group drop-shadow-sm ${
                isScrolled || !isHome 
                  ? 'text-gray-900 dark:text-white hover:bg-red-50 dark:hover:bg-white/5' 
                  : 'text-white hover:bg-white/10 backdrop-blur-md'
              }`}
            >
              <ShoppingCart size={18} className="group-hover:text-red-600 transition-colors" />
              {cartCount > 0 && (
                <m.span 
                  key={cartCount}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-gray-900 shadow-lg shadow-red-600/30"
                >
                  {cartCount}
                </m.span>
              )}
            </Link>

            {/* AUTH */}
            {currentUser ? (
              <div className="relative">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`flex items-center gap-3 p-1.5 pr-4 rounded-[1.25rem] border-2 transition-all hover:shadow-xl active:scale-95 group ${
                    isScrolled || !isHome 
                      ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-white/5 text-gray-900 dark:text-white shadow-lg shadow-black/5' 
                      : 'bg-white/10 border-white/20 text-white backdrop-blur-md'
                  }`}
                >
                  <div className="w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-red-600/30 group-hover:rotate-6 transition-transform">
                    {userProfile?.name?.charAt(0) || userProfile?.phone?.slice(-1) || 'U'}
                  </div>
                  <span className="text-sm font-black truncate max-w-[100px] tracking-tight">
                    {userProfile?.name || 'Account'}
                  </span>
                  <ChevronDown size={14} className={`transition-transform duration-500 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                      <m.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-card rounded-3xl shadow-xl border border-gray-100 dark:border-white/5 py-3 z-50 overflow-hidden"
                      >
                        <div className="px-5 py-4 border-b border-gray-50 dark:border-white/5 mb-2 bg-gray-50/50 dark:bg-white/5">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Account</p>
                          <p className="text-sm font-black text-gray-900 dark:text-white truncate">{userProfile?.phone || currentUser.email}</p>
                        </div>
                        
                        <div className="px-2 space-y-1">
                          {userProfile?.role === 'admin' && (
                            <Link to="/admin" className="flex items-center gap-3 px-4 py-3 text-sm font-black text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-white/5 hover:text-red-600 rounded-2xl transition-all group">
                              <div className="w-9 h-9 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                                <LayoutDashboard size={16} />
                              </div>
                              Admin Panel
                            </Link>
                          )}
                          
                          <Link to="/account" className="flex items-center gap-3 px-4 py-3 text-sm font-black text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-white/5 hover:text-red-600 rounded-2xl transition-all group">
                            <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                              <User size={16} />
                            </div>
                            Account
                          </Link>

                          <Link to="/my-orders" className="flex items-center gap-3 px-4 py-3 text-sm font-black text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-white/5 hover:text-red-600 rounded-2xl transition-all group">
                            <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                              <ShoppingBag size={16} />
                            </div>
                            My Orders
                          </Link>
                          
                          <button 
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all mt-1 group"
                          >
                            <div className="w-9 h-9 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                              <LogOut size={16} />
                            </div>
                            Logout
                          </button>
                        </div>
                      </m.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => navigate(tenantSlug ? `/k/${tenantSlug}/login` : '/login')}
                className="px-8 py-3 bg-red-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-red-600/30 hover:bg-red-700 hover:scale-105 active:scale-95 transition-all"
              >
                Login
              </button>
            )}
          </div>

          {/* MOBILE TOGGLE */}
          <div className="flex items-center gap-2 md:hidden">
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-2xl transition-all active:scale-90 drop-shadow-sm bg-black/10 backdrop-blur-md text-gray-900 dark:text-white"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button 
              onClick={() => navigate(tenantSlug ? `/k/${tenantSlug}/account` : '/account')}
              className="p-2.5 rounded-2xl transition-all active:scale-90 drop-shadow-sm bg-black/10 backdrop-blur-md text-gray-900 dark:text-white"
              aria-label="Profile"
            >
              <User size={20} />
            </button>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2.5 rounded-2xl transition-all active:scale-90 drop-shadow-sm bg-black/10 backdrop-blur-md text-gray-900 dark:text-white"
            >
              {isMenuOpen ? <X size={22} /> : <MenuIcon size={22} />}
            </button>
          </div>
        </div>
      </div>
    </nav>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <m.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <m.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[80%] max-w-sm z-50 bg-white dark:bg-dark-card shadow-2xl md:hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  {renderBranding(true)}
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-100 dark:border-white/5 active:scale-90 transition-all">
                  <X size={20} className="text-gray-900 dark:text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 px-2">Main Menu</p>
                  <MobileNavLink to="/" label="Home" active={location.pathname === '/'} icon={<MapPin size={18} />} />
                  <MobileNavLink to="/menu" label="Menu" active={location.pathname === '/menu'} icon={<Utensils size={18} />} />
                  <MobileNavLink to="/checkout" label="Cart" active={location.pathname === '/checkout'} icon={<ShoppingCart size={18} />} badge={cartCount} />
                </div>
                
                <div className="h-px bg-gray-100 dark:bg-white/5"></div>
                
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 px-2">Account & More</p>
                  <MobileNavLink to="/account" label="Profile" active={location.pathname === '/account'} icon={<User size={18} />} />
                  {currentUser ? (
                    <>
                      {userProfile?.role === 'admin' && (
                        <MobileNavLink to="/admin" label="Admin Panel" active={location.pathname === '/admin'} icon={<LayoutDashboard size={18} />} />
                      )}
                      <MobileNavLink to="/my-orders" label="My Orders" active={location.pathname === '/my-orders'} icon={<ShoppingBag size={18} />} />
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 py-4 px-2 text-red-600 font-black text-lg group active:scale-95 transition-all"
                      >
                        <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                          <LogOut size={18} />
                        </div>
                        Logout
                      </button>
                    </>
                    ) : (
                      <button
                        onClick={() => navigate(tenantSlug ? `/k/${tenantSlug}/login` : '/login')}
                        className="w-full mt-auto py-4 bg-red-600 text-white font-bold rounded-2xl uppercase tracking-widest text-sm shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                      >
                        <User size={18} />
                        Login / Sign Up
                      </button>
                    )}</div>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Customer Support</p>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const MobileNavLink = ({ to, label, active, icon, badge }: { to: string, label: string, active: boolean, icon: React.ReactNode, badge?: number }) => (
  <Link 
    to={to} 
    className={`flex items-center justify-between py-5 px-2 group transition-all active:scale-95 ${active ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}
  >
    <div className="flex items-center gap-5">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${active ? 'bg-red-600 text-white shadow-red-600/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
        {icon}
      </div>
      <span className="text-xl font-black tracking-tight">{label}</span>
    </div>
    <div className="flex items-center gap-3">
      {badge !== undefined && badge > 0 && (
        <span className="bg-red-600 text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg shadow-red-600/30">
          {badge}
        </span>
      )}
      {!active && <ChevronRight size={22} className="text-gray-300 dark:text-gray-700" />}
    </div>
  </Link>
);

const NavLink = ({ to, label, active, light }: { to: string, label: string, active: boolean, light?: boolean }) => (
  <Link 
    to={to} 
    className={`relative text-sm font-bold tracking-wider uppercase transition-all hover:text-red-600 py-2 ${
      active 
        ? 'text-red-600' 
        : light ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'
    }`}
  >
    {label}
    {active && (
      <m.div 
        layoutId="navUnderline"
        className="absolute -bottom-1 left-0 right-0 h-1 bg-red-600 rounded-full shadow-lg shadow-red-600/30"
      />
    )}
  </Link>
);

export default Navbar;
