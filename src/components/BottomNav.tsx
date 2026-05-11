import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, User, Utensils } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '../utils/haptics';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();
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
    { label: 'Home', path: '/', icon: Home },
    { label: 'Menu', path: '/menu', icon: Utensils },
    { label: 'Orders', path: '/my-orders', icon: ShoppingBag, badge: 0 }, // Using 0 for badge as placeholder
    { label: 'Profile', path: '/account', icon: User },
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
        <div className="mib-glass max-w-lg mx-auto rounded-[2rem] px-2 py-2 flex items-center justify-around shadow-2xl relative overflow-hidden pointer-events-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            const displayBadge = item.label === 'Orders' ? 0 : (item.label === 'Menu' ? 0 : 0); // Logic can be expanded

            return (
              <button
                key={item.path}
                onClick={() => {
                  triggerHaptic('light');
                  navigate(item.path);
                }}
                className="relative flex flex-col items-center justify-center w-16 h-12 transition-all duration-300"
              >
                {isActive && (
                  <motion.div
                    layoutId="navPill"
                    className="absolute inset-0 bg-white/10 rounded-2xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <div className={`relative transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100 opacity-60'}`}>
                    <Icon 
                      size={20} 
                      strokeWidth={isActive ? 2.5 : 2}
                      className={isActive ? 'text-orange-500' : 'text-white'} 
                    />
                  </div>
                  <span className={`text-[9px] font-black tracking-widest uppercase transition-all duration-300 ${isActive ? 'text-white opacity-100' : 'text-white/40 opacity-100'}`}>
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </motion.nav>
    </AnimatePresence>
  );
};

export default BottomNav;
