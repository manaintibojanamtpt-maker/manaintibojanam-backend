import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, User, Utensils } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '../utils/haptics';
import ActiveOrderStrip from './ActiveOrderStrip';
import { cn } from '../lib/utils';
import { useTenant } from '../context/TenantContext';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();
  const { tenantSlug } = useTenant();
  const basePath = tenantSlug ? `/k/${tenantSlug}` : '';
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide navigation on scroll down, show on scroll up
  useEffect(() => {
    const mainContainer = document.getElementById('main-scroll-container');
    if (!mainContainer) return;

    let lastScrollY = mainContainer.scrollTop;
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = mainContainer.scrollTop;
          const maxScroll = mainContainer.scrollHeight - mainContainer.clientHeight;
          
          if (currentScrollY <= 0 || currentScrollY >= maxScroll) {
            ticking = false;
            return;
          }
          
          if (currentScrollY > lastScrollY && currentScrollY > 60) {
            setIsVisible(false);
          } else if (currentScrollY < lastScrollY - 3) {
            setIsVisible(true);
          }
          
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    mainContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainContainer.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const navItems = [
    { label: 'Home', path: `${basePath}/`, icon: Home },
    { label: 'Menu', path: `${basePath}/menu`, icon: Utensils },
    { label: 'Orders', path: `${basePath}/my-orders`, icon: ShoppingBag, badge: 0 }, // Using 0 for badge as placeholder
    { label: 'Profile', path: `${basePath}/account`, icon: User },
  ];

  return (
    <AnimatePresence>
      <motion.nav
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: isVisible ? 0 : 100, opacity: isVisible ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 pointer-events-none"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <ActiveOrderStrip />
        <div className="max-w-lg mx-auto bg-black/80 dark:bg-[#121212]/90 backdrop-blur-3xl rounded-[2.5rem] px-2 py-2 flex items-center justify-around shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden pointer-events-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => {
                  if (!isActive) {
                    triggerHaptic('light');
                    navigate(item.path);
                  }
                }}
                className="relative flex flex-col items-center justify-center w-16 h-12 group"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeBar"
                    className="absolute -bottom-1 w-1 h-1 bg-orange-500 rounded-full"
                    transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                  />
                )}
                
                <div className="relative z-10 flex flex-col items-center gap-1.5">
                  <motion.div 
                    animate={{ 
                      y: isActive ? -2 : 0,
                      scale: isActive ? 1.15 : 1
                    }}
                    className={cn(
                      "transition-colors duration-300",
                      isActive ? 'text-orange-500' : 'text-white/40 group-active:text-white/60'
                    )}
                  >
                    <Icon 
                      size={20} 
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </motion.div>
                  <span className={cn(
                    "text-[8px] font-black tracking-[0.2em] uppercase transition-all duration-300",
                    isActive ? 'text-white' : 'text-white/20'
                  )}>
                    {item.label}
                  </span>
                </div>

                {isActive && (
                   <motion.div
                     layoutId="navGlow"
                     className="absolute inset-0 bg-orange-500/5 blur-xl rounded-full"
                     transition={{ duration: 1 }}
                   />
                )}
              </button>
            );
          })}
        </div>
      </motion.nav>
    </AnimatePresence>
  );
};

export default BottomNav;
