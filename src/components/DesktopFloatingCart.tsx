import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';

const DesktopFloatingCart = () => {
  const { cart, total, itemCount, updateQuantity } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { tenantSlug } = useTenant();
  const basePath = tenantSlug ? `/k/${tenantSlug}` : '';

  if (itemCount === 0) return null;

  return (
    <div className="hidden xl:block fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {isOpen ? (
          <m.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="bg-white dark:bg-[#151515] rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 w-96 overflow-hidden flex flex-col max-h-[600px]"
          >
            <div className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <ShoppingCart className="text-orange-500" size={20} />
                <h3 className="font-bold text-gray-900 dark:text-white">Your Cart</h3>
                <span className="bg-orange-500 text-white text-[10px] font-black rounded-full px-2 py-0.5">{itemCount} items</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-4 items-center">
                  <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover border border-gray-100 dark:border-white/5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{item.name}</h4>
                    <p className="text-xs font-bold text-orange-500">{formatPrice(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-1.5">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="text-gray-500 hover:text-red-500">
                      <Minus size={14} />
                    </button>
                    <span className="text-xs font-black w-4 text-center dark:text-white">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="text-orange-500">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-gray-500">Subtotal</span>
                <span className="text-xl font-black text-gray-900 dark:text-white">{formatPrice(total)}</span>
              </div>
              <button
                onClick={() => navigate(`${basePath}/checkout`)}
                className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30"
              >
                Proceed to Checkout <ArrowRight size={18} />
              </button>
            </div>
          </m.div>
        ) : (
          <m.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="bg-black dark:bg-white text-white dark:text-black rounded-full h-16 px-6 flex items-center justify-center gap-3 shadow-2xl border border-white/10"
          >
            <div className="relative">
              <ShoppingCart size={24} />
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-black dark:border-white">
                {itemCount}
              </span>
            </div>
            <div className="flex flex-col items-start leading-none ml-2">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">View Cart</span>
              <span className="text-sm font-bold">{formatPrice(total)}</span>
            </div>
          </m.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DesktopFloatingCart;
