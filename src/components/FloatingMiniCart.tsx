import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { ShoppingBag, X, Plus, Minus, ArrowRight, ChevronUp, ChevronDown } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTenant } from '../context/TenantContext';
import { formatPrice } from '../lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { triggerHaptic } from '../utils/haptics';

const FloatingMiniCart: React.FC = () => {
  const { cart, total, itemCount, updateQuantity, removeFromCart } = useCart();
  const [snapState, setSnapState] = useState<'collapsed' | 'expanded' | 'active'>('collapsed');
  const navigate = useNavigate();
  const location = useLocation();
  const controls = useAnimation();
  const { tenantSlug } = useTenant();
  const basePath = tenantSlug ? `/k/${tenantSlug}` : '';

  useEffect(() => {
    const scrollContainer = document.getElementById('main-scroll-container');
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (snapState !== 'collapsed') setSnapState('collapsed');
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [snapState]);

  useEffect(() => {
    if (itemCount > 0) {
      controls.start({
        scale: [1, 1.1, 1],
        transition: { duration: 0.3 }
      });
    }
  }, [itemCount]);

  // Hide on checkout
  if (itemCount === 0 || location.pathname === `${basePath}/checkout`) return null;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    if (snapState === 'active') setSnapState('expanded');
    else if (snapState === 'expanded') setSnapState('active');
    else setSnapState('expanded');
  };

  const handleCheckout = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('success');
    navigate(`${basePath}/checkout`);
  };

  return (
    <div 
      className="fixed left-1/2 -translate-x-1/2 z-[90] w-full max-w-[360px] px-4 pointer-events-none"
      style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="relative flex flex-col items-center">
        
        {/* SNAP STATE 3: ACTIVE (Mini List) */}
        <AnimatePresence>
          {snapState === 'active' && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-full mb-3 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 dark:border-white/10 pointer-events-auto overflow-hidden"
            >
              <div className="p-4 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Quick Edit</span>
                <button onClick={() => setSnapState('expanded')} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white">
                  <ChevronDown size={18} />
                </button>
              </div>
              
              <div className="max-h-[220px] overflow-y-auto p-4 space-y-4 no-scrollbar">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                      <p className="text-[10px] font-bold text-orange-600">{formatPrice(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-500"
                      >
                        <Minus size={12} strokeWidth={3} />
                      </button>
                      <span className="text-xs font-black w-4 text-center dark:text-white">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center text-orange-600"
                      >
                        <Plus size={12} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN PILL (States 1 & 2) */}
        <motion.div
          animate={controls}
          className="pointer-events-auto"
        >
          <motion.div
            layout
            initial={false}
            animate={{
              width: snapState === 'collapsed' ? 64 : '100%',
              borderRadius: snapState === 'collapsed' ? 32 : 24,
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="h-14 bg-[#120D0A]/90 backdrop-blur-xl border border-white/10 text-white shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)] flex items-center overflow-hidden cursor-pointer group"
            onClick={toggleExpand}
          >
            <div className="flex items-center w-full px-4">
              {/* Icon & Count Badge */}
              <div className="relative shrink-0 flex items-center justify-center w-8 h-8">
                <ShoppingBag size={20} strokeWidth={2.5} className="text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 text-white text-[9px] font-black shadow-sm">
                  {itemCount}
                </span>
              </div>

              {/* Expanded Info */}
              <AnimatePresence mode="popLayout">
                {snapState !== 'collapsed' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1 flex items-center justify-between ml-3 overflow-hidden"
                  >
                    <div className="min-w-0 mr-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-orange-200/60 leading-none mb-0.5">Subtotal</p>
                      <p className="text-sm font-black tracking-tight">{formatPrice(total)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSnapState(snapState === 'active' ? 'expanded' : 'active'); }}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                      >
                        {snapState === 'active' ? <ChevronDown size={14} className="text-white/70" /> : <ChevronUp size={14} className="text-white/70" />}
                      </button>
                      <button 
                        onClick={handleCheckout}
                        className="bg-gradient-to-br from-[#ff6b35] to-[#ff9f1c] hover:from-[#ff8a65] hover:to-[#ffb366] text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_8px_16px_-6px_rgba(255,107,53,0.5)] active:scale-95 transition-all"
                      >
                        Checkout
                        <ArrowRight size={12} strokeWidth={3} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default FloatingMiniCart;
