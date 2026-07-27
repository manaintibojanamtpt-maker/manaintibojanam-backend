import React, { useEffect, useState } from 'react';
import { m, AnimatePresence, useAnimation } from 'framer-motion';
import { ShoppingBag, Plus, Minus, ArrowRight, ChevronUp, ChevronDown } from 'lucide-react';
import type { MarketplaceCartLineView } from './types';

export interface MarketplaceFloatingCartViewProps {
  itemCount: number;
  totalLabel: string;
  lines: readonly MarketplaceCartLineView[];
  onUpdateQuantity: (lineId: string, quantity: number) => void;
  onCheckout: () => void;
  onHaptic?: (kind: 'light' | 'medium' | 'success') => void;
  hidden?: boolean;
  scrollContainerId?: string;
}

export const MarketplaceFloatingCartView: React.FC<MarketplaceFloatingCartViewProps> = ({
  itemCount,
  totalLabel,
  lines,
  onUpdateQuantity,
  onCheckout,
  onHaptic,
  hidden = false,
  scrollContainerId = 'main-scroll-container',
}) => {
  const [snapState, setSnapState] = useState<'collapsed' | 'expanded' | 'active'>('collapsed');
  const controls = useAnimation();

  useEffect(() => {
    const scrollContainer = document.getElementById(scrollContainerId);
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (snapState !== 'collapsed') setSnapState('collapsed');
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [snapState, scrollContainerId]);

  useEffect(() => {
    if (itemCount > 0) {
      controls.start({
        scale: [1, 1.1, 1],
        transition: { duration: 0.3 },
      });
    }
  }, [itemCount, controls]);

  if (hidden || itemCount <= 0) return null;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHaptic?.('light');
    if (snapState === 'active') setSnapState('expanded');
    else if (snapState === 'expanded') setSnapState('active');
    else setSnapState('expanded');
  };

  const handleCheckout = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHaptic?.('success');
    onCheckout();
  };

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[90] w-full max-w-[360px] px-4 pointer-events-none"
      style={{ bottom: 'calc(96px + var(--ob-safe-bottom))' }}
    >
      <div className="relative flex flex-col items-center">
        <AnimatePresence>
          {snapState === 'active' && (
            <m.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-full mb-3 w-full overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#120d0c]/95 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl pointer-events-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] p-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#c4b5a5]">Quick edit</span>
                <button
                  type="button"
                  onClick={() => setSnapState('expanded')}
                  className="p-1 text-white/50 hover:text-white"
                  aria-label="Collapse quick edit"
                >
                  <ChevronDown size={18} />
                </button>
              </div>

              <div className="max-h-[220px] overflow-y-auto p-4 space-y-4 no-scrollbar">
                {lines.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-bold text-[#fff8f0]">{item.name}</p>
                      <p className="text-[10px] font-bold text-[#e85d04]">{item.priceLabel}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-[#e85d04]/20 bg-[#050403]/80 p-0.5">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="flex h-10 w-10 items-center justify-center text-white/60 hover:text-red-400 touch-manipulation"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} strokeWidth={3} aria-hidden />
                      </button>
                      <span className="w-4 text-center text-xs font-black text-[#fff8f0]">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="flex h-10 w-10 items-center justify-center text-[#e85d04] touch-manipulation"
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} strokeWidth={3} aria-hidden />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </m.div>
          )}
        </AnimatePresence>

        <m.div animate={controls} className="pointer-events-auto">
          <m.div
            layout
            initial={false}
            animate={{
              width: snapState === 'collapsed' ? 64 : '100%',
              borderRadius: snapState === 'collapsed' ? 32 : 24,
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="h-14 bg-[#120d0c]/95 backdrop-blur-xl border border-white/[0.08] text-[#fff8f0] shadow-[0_12px_40px_-10px_rgba(0,0,0,0.55)] flex items-center overflow-hidden cursor-pointer group"
            onClick={toggleExpand}
          >
            <div className="flex items-center w-full px-4">
              <div className="relative shrink-0 flex items-center justify-center w-8 h-8">
                <ShoppingBag size={20} strokeWidth={2.5} className="text-[#e85d04] group-hover:scale-110 transition-transform" />
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e85d04] text-[#fff8f0] text-[9px] font-black shadow-sm">
                  {itemCount}
                </span>
              </div>

              <AnimatePresence mode="popLayout">
                {snapState !== 'collapsed' && (
                  <m.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1 flex items-center justify-between ml-3 overflow-hidden"
                  >
                    <div className="min-w-0 mr-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#f4a261]/70 leading-none mb-0.5">Subtotal</p>
                      <p className="text-sm font-black tracking-tight text-[#fff8f0]">{totalLabel}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSnapState(snapState === 'active' ? 'expanded' : 'active');
                        }}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                        aria-label="Toggle cart lines"
                      >
                        {snapState === 'active' ? (
                          <ChevronDown size={14} className="text-white/70" />
                        ) : (
                          <ChevronUp size={14} className="text-white/70" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCheckout}
                        className="bg-gradient-to-br from-[#e85d04] to-[#f4a261] hover:from-[#f0701a] hover:to-[#f6b078] text-[#fff8f0] px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_8px_16px_-6px_rgba(232,93,4,0.55)] active:scale-95 transition-all"
                      >
                        Checkout
                        <ArrowRight size={12} strokeWidth={3} />
                      </button>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </m.div>
        </m.div>
      </div>
    </div>
  );
};

export default MarketplaceFloatingCartView;
