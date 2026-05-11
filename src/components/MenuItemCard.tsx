import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatPrice } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '../utils/haptics';
import { Minus, Plus, Star, Check } from 'lucide-react';

interface MenuItemCardProps {
  item: any;
  index?: number;
  addToCart: (item: any, addons?: any[]) => void;
  updateQuantity: (id: string, q: number) => void;
  getItemQuantity: (id: string) => number;
  isStoreOpenNow: () => boolean;
  storeOpenTime?: string;
  onViewReviews?: (item: any) => void;
}

const fallbackImage =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 400%22%3E%3Crect width=%22400%22 height=%22400%22 fill=%22%230d0d0d%22/%3E%3Ctext x=%22200%22 y=%22210%22 fill=%22%23ffffff%22 font-family=%22Arial%2C%20sans-serif%22 font-size=%2228%22 text-anchor=%22middle%22%3ENo%20Image%3C/text%3E%3C/svg%3E';

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  index = 0,
  addToCart,
  updateQuantity,
  getItemQuantity,
  isStoreOpenNow,
  storeOpenTime,
  onViewReviews
}) => {
  const navigate = useNavigate();
  const [showAddonModal, setShowAddonModal] = React.useState(false);
  const [selectedAddons, setSelectedAddons] = React.useState<any[]>([]);
  const [showSuccess, setShowSuccess] = React.useState(false);

  const [imageLoaded, setImageLoaded] = React.useState(false);

  const isOpen = isStoreOpenNow();
  const openingTime = storeOpenTime || '09:00';
  const quantity = Math.max(0, Number(getItemQuantity(item.id) ?? 0));
  const rating = Number(item.rating ?? 0);
  const rawImageUrl = (item?.image ?? item?.imageUrl ?? '') as any;
  const imageUrl = (() => {
    if (typeof rawImageUrl !== 'string') return fallbackImage;
    const normalized = rawImageUrl.trim();
    if (!normalized) return fallbackImage;
    if (normalized === 'undefined' || normalized === 'null') return fallbackImage;
    if (normalized.startsWith('gs://')) return fallbackImage;
    if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('/') || normalized.startsWith('data:')) {
      return normalized;
    }
    return fallbackImage;
  })();
  const discount = Number(item.discount || 0);

  const getBadgeDetails = () => {
    const name = String(item.name || '').toLowerCase();
    const orderCount = Number(item.itemOrderCount ?? item.ratingCount ?? 0);
    const ratingVal = Number(item.rating ?? 0);

    if (orderCount >= 20 || item.isPopular) return { text: 'Bestseller', type: 'trending' };
    if (ratingVal > 4.0 && orderCount > 5) return { text: 'Must Try', type: 'bestseller' };
    if (name.includes('ghee')) return { text: 'Pure ghee', type: 'normal' };
    if (name.includes('masala')) return { text: 'Signature', type: 'normal' };
    if (ratingVal > 4.5) return { text: 'Top Rated', type: 'normal' };
    return null;
  };

  const { triggerFlyToCart } = useCart();

  const handleAdd = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isOpen) {
      toast.success(`Added to cart for tomorrow. Orders open at ${openingTime}.`, { icon: '🌙', duration: 4000 });
    }

    addToCart(item);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 800);
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(50);
    }
    
    if (e && triggerFlyToCart && imageUrl !== fallbackImage) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      triggerFlyToCart(imageUrl, rect.left + rect.width / 2 - 40, rect.top + rect.height / 2 - 40);
    }
  };

  const badgeDetails = getBadgeDetails();

  return (
    <motion.article 
      id={`menu-item-${item.id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
      className="relative flex justify-between gap-4 py-5 px-4 bg-dark-bg border-b border-white/5 last:border-b-0 transition-[box-shadow] duration-500"
    >
      {/* Left Info Column */}
      <div className="flex-1 min-w-0 pr-2 flex flex-col justify-start">
        <div className="flex items-center gap-1.5 mb-1.5">
          {/* Veg/Non-Veg Indicator */}
          <span className={`inline-flex h-4 w-4 items-center justify-center rounded-[4px] border bg-black/70 ${
            item.type === 'veg' ? 'border-emerald-500/80' : 'border-red-500/80'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${item.type === 'veg' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </span>
          
          {badgeDetails && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
              badgeDetails.type === 'trending' ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {badgeDetails.text}
            </span>
          )}
        </div>
        
        <h3 className="text-[15px] sm:text-base font-bold text-white tracking-tight leading-snug line-clamp-2">
          {item.name}
        </h3>
        
        <div className="flex items-center gap-2 mt-1 mb-2">
          <span className="font-bold text-sm text-white/90">{formatPrice(item.price)}</span>
          {rating > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewReviews?.(item); }}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-white/10 bg-white/5 active:scale-95 transition-transform"
            >
              <span className="text-[10px] font-bold text-white/80">{rating.toFixed(1)}</span>
              <Star size={10} className="fill-green-500 text-green-500" />
            </button>
          )}
        </div>

        <p className="text-[11px] sm:text-xs text-white/40 line-clamp-2 leading-relaxed font-medium">
          {item.description}
        </p>
      </div>

      {/* Right Image & CTA Column */}
      <div className="relative flex flex-col items-center flex-shrink-0 mb-3 ml-2">
        <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-2xl bg-white/5 overflow-hidden shadow-lg border border-white/5">
          {!imageLoaded && <div className="absolute inset-0 bg-white/5 shimmer z-0" />}
          <img
            src={imageUrl}
            alt={item.name}
            loading={index < 4 ? "eager" : "lazy"}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ aspectRatio: '1/1' }}
            onError={(event) => {
              const target = event.currentTarget as HTMLImageElement;
              target.onerror = null;
              target.src = fallbackImage;
            }}
          />
        </div>
        
        {/* Floating Add Button */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 w-[85%]">
          {showSuccess ? (
            <motion.div 
              initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              className="h-9 w-full bg-emerald-500/20 backdrop-blur-md rounded-full flex items-center justify-center border border-emerald-500/50"
            >
              <Check size={18} className="text-emerald-400" strokeWidth={3} />
            </motion.div>
          ) : quantity > 0 && !(item.addons && item.addons.length > 0) ? (
            <div className="h-9 w-full bg-black/60 backdrop-blur-md rounded-full flex items-center justify-between px-1 shadow-lg border border-orange-500/30">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  updateQuantity(item.id, quantity - 1);
                }}
                className="w-7 h-7 flex items-center justify-center active:bg-white/10 rounded-full transition-colors"
              >
                <Minus size={14} className="text-orange-400" strokeWidth={2.5} />
              </button>
              <span className="text-sm font-bold text-white">{quantity}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('medium');
                  addToCart(item);
                }}
                className="w-7 h-7 flex items-center justify-center active:bg-white/10 rounded-full transition-colors"
              >
                <Plus size={14} className="text-orange-400" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('medium');
                if (item.addons && item.addons.length > 0) {
                  setShowAddonModal(true);
                } else {
                  handleAdd(e);
                }
              }}
              className="h-9 w-full bg-black/60 hover:bg-black/80 text-orange-400 rounded-full flex items-center justify-center font-bold text-xs uppercase tracking-wider border border-orange-500/30 backdrop-blur-md transition-colors shadow-lg"
            >
              ADD
              {item.addons && item.addons.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500 border border-dark-bg"></span>
                </span>
              )}
            </motion.button>
          )}
        </div>
      </div>
      
      <AnimatePresence>
        {showAddonModal && item.addons && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setShowAddonModal(false); }}>
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gray-900 sm:border border-gray-800 rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl relative" 
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mt-4 mb-2 sm:hidden" />
              <div className="p-5 sm:p-6 border-b border-gray-800 shrink-0">
                <h3 className="text-xl font-bold text-white tracking-tight">Customise {item.name}</h3>
                <p className="text-xs text-gray-400 mt-1 font-medium">Select add-ons</p>
              </div>
              
              <div className="p-5 sm:p-6 overflow-y-auto space-y-3 overscroll-contain flex-1">
                {item.addons.map((addon: any) => (
                  <label key={addon.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-800 bg-gray-800/50 cursor-pointer hover:border-orange-500/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-gray-700 bg-gray-900 text-orange-600 focus:ring-orange-500/50"
                        checked={selectedAddons.some(a => a.id === addon.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAddons([...selectedAddons, addon]);
                          } else {
                            setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
                          }
                        }}
                      />
                      <span className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">{addon.name}</span>
                    </div>
                    <span className="text-sm font-bold text-orange-400">+{formatPrice(addon.price)}</span>
                  </label>
                ))}
              </div>

              <div className="p-5 sm:p-6 border-t border-gray-800 bg-gray-900 shrink-0 flex items-center justify-between gap-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Item Total</p>
                  <p className="text-2xl font-bold text-white tracking-tight">
                    {formatPrice(item.price + selectedAddons.reduce((sum, a) => sum + a.price, 0))}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    if (!isOpen) {
                      toast.success(`Added to cart for tomorrow. Orders open at ${openingTime}.`, { icon: '🌙', duration: 4000 });
                    }
                    addToCart(item, selectedAddons);
                    setShowAddonModal(false);
                    setSelectedAddons([]);
                    triggerHaptic('success');
                  }}
                  className="flex-1 py-4 bg-orange-600 text-white rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-transform"
                >
                  Add item to cart
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.article>
  );
};

export default React.memo(MenuItemCard);
