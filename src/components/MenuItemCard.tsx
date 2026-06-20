import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatPrice, cn } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import BottomSheet from './BottomSheet';
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
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="relative flex justify-between gap-4 py-4 px-4 bg-gray-50 dark:bg-[#151515] border-b border-gray-200 dark:border-white/5 last:border-b-0 transition-colors active:bg-gray-100 dark:active:bg-white/[0.02]"
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
              badgeDetails.type === 'trending' ? 'bg-[#D4A574]/20 text-[#F4C27A]' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {badgeDetails.text}
            </span>
          )}
        </div>
        
        <h3 className="text-[16px] sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight leading-snug line-clamp-2 mb-0.5">
          {item.name}
        </h3>
        
        <div className="flex items-center gap-2 mt-1 mb-2">
          <span className="font-extrabold text-base text-gray-900 dark:text-white">{formatPrice(item.price)}</span>
          {rating > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewReviews?.(item); }}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/10 active:scale-95 transition-transform"
            >
              <span className="text-[10px] font-bold text-gray-700 dark:text-white/80">{rating.toFixed(1)}</span>
              <Star size={10} className="fill-green-500 text-green-500" />
            </button>
          )}
        </div>

        <p className="text-[12px] sm:text-sm text-gray-500 dark:text-white/50 line-clamp-2 leading-relaxed font-medium tracking-wide">
          {item.description}
        </p>
      </div>

      {/* Right Image & CTA Column */}
      <div className="relative flex flex-col items-center flex-shrink-0 mb-3 ml-2">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-xl bg-gray-200 dark:bg-white/10 overflow-hidden shadow-sm border border-gray-200 dark:border-white/5 relative group"
        >
          {!imageLoaded && <div className="absolute inset-0 bg-white/10 shimmer z-0" />}
          <img
            src={imageUrl}
            alt={item.name}
            loading={index < 4 ? "eager" : "lazy"}
            onLoad={() => setImageLoaded(true)}
            className={cn(
              "w-full h-full object-cover transition-all duration-700",
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
            )}
            style={{ aspectRatio: '1/1' }}
            onError={(event) => {
              const target = event.currentTarget as HTMLImageElement;
              target.onerror = null;
              target.src = fallbackImage;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.div>
        
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
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="h-10 w-full bg-orange-50 dark:bg-[#2A1A12] rounded-full flex items-center justify-between px-1.5 shadow-sm border border-orange-200 dark:border-orange-500/30"
            >
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  updateQuantity(item.id, quantity - 1);
                }}
                className="w-7 h-7 flex items-center justify-center hover:bg-orange-200 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <Minus size={14} className="text-orange-600 dark:text-[#F4C27A]" strokeWidth={3} />
              </motion.button>
              <motion.span 
                key={quantity}
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-sm font-black text-orange-900 dark:text-white tabular-nums"
              >
                {quantity}
              </motion.span>
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('medium');
                  addToCart(item);
                }}
                className="w-7 h-7 flex items-center justify-center hover:bg-orange-200 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <Plus size={14} className="text-orange-600 dark:text-[#F4C27A]" strokeWidth={3} />
              </motion.button>
            </motion.div>
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
              className="h-10 w-full bg-white dark:bg-white text-orange-600 dark:text-black border border-orange-200 dark:border-transparent hover:bg-orange-50 dark:hover:bg-gray-100 rounded-full flex items-center justify-center font-black text-xs uppercase tracking-widest shadow-sm transition-all"
            >
              ADD
              {item.addons && item.addons.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F4C27A] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#D4A574] border border-dark-bg"></span>
                </span>
              )}
            </motion.button>
          )}
        </div>
      </div>
      
      <BottomSheet
        isOpen={showAddonModal}
        onClose={() => {
          setShowAddonModal(false);
          setSelectedAddons([]);
        }}
        title="Customize Your Order"
      >
        <div className="flex flex-col h-full">
          {item.addons?.map((addon: any) => (
            <div key={addon.name} className="flex items-center justify-between py-4 border-b border-white/5 last:border-b-0">
              <div>
                <p className="text-white font-bold text-base">{addon.name}</p>
                <p className="text-white/50 text-sm font-medium tracking-wide">{formatPrice(addon.price)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  const isSelected = selectedAddons.some(a => a.name === addon.name);
                  if (isSelected) {
                    setSelectedAddons(selectedAddons.filter(a => a.name !== addon.name));
                  } else {
                    setSelectedAddons([...selectedAddons, addon]);
                  }
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                  selectedAddons.some(a => a.name === addon.name)
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white/5 border-white/20 text-transparent'
                }`}
              >
                <Check size={14} strokeWidth={3} className={selectedAddons.some(a => a.name === addon.name) ? 'opacity-100' : 'opacity-0'} />
              </button>
            </div>
          ))}
          <div className="mt-6 shrink-0 sticky bottom-0 bg-dark-bg pb-safe">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAdd(e);
                setShowAddonModal(false);
                setSelectedAddons([]);
              }}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-[0_10px_30px_rgba(255,107,53,0.3)]"
            >
              Add Item • {formatPrice(item.price + selectedAddons.reduce((sum, a) => sum + a.price, 0))}
            </button>
          </div>
        </div>
      </BottomSheet>
    </motion.article>
  );
};

export default React.memo(MenuItemCard);
