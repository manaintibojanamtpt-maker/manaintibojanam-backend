import React, { memo } from 'react';
import { m } from 'framer-motion';
import { Store, ChefHat, ShoppingBag, User, ArrowDown } from 'lucide-react';
import { orderBhojanPublic } from '../../config/demoData';

export const HeroEcosystemCard = memo(function HeroEcosystemCard() {
  return (
    <div className="relative w-full max-w-md mx-auto lg:max-w-none" aria-label="BhojanOS ecosystem overview">
      <div
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[#FF7A00]/[0.06] blur-3xl"
        aria-hidden
      />
      <div className="relative marketing-hero-glass-card rounded-[1.35rem] sm:rounded-[1.75rem] border border-white/[0.08] overflow-hidden shadow-[0_32px_64px_-24px_rgba(0,0,0,0.75)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#080808]/90">
          <span className="text-sm font-black text-white tracking-tight">
            Bhojan<span className="text-[#FF7A00]">OS</span>
          </span>
          <span className="text-[10px] font-mono text-neutral-500">Restaurant → Customer</span>
        </div>

        <div className="p-4 sm:p-6 bg-[#0A0A0A]/95 space-y-2">
          {[
            { icon: Store, label: 'Restaurant', sub: 'Runs the business', delay: 0.1 },
            { icon: ChefHat, label: 'BhojanOS', sub: 'Restaurant platform', delay: 0.2, highlight: true },
            { icon: ShoppingBag, label: 'OrderBhojan', sub: 'Customer ordering', delay: 0.3, highlight: true },
            { icon: User, label: 'Customer', sub: 'Discovers & orders', delay: 0.4 },
          ].map((item, i) => (
            <React.Fragment key={item.label}>
              <m.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12, duration: 0.4 }}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  item.highlight
                    ? 'border-[#FF7A00]/25 bg-[#FF7A00]/[0.06]'
                    : 'border-white/[0.06] bg-white/[0.02]'
                }`}
              >
                <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${
                  item.highlight ? 'bg-[#FF7A00]/15' : 'bg-white/[0.05]'
                }`}>
                  <item.icon size={18} className="text-[#FF7A00]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{item.label}</p>
                  <p className="text-[11px] text-neutral-400 truncate">{item.sub}</p>
                </div>
              </m.div>
              {i < 3 && (
                <div className="flex justify-center py-0.5">
                  <ArrowDown size={14} className="text-[#FF7A00]/60" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-white/[0.06] bg-[#080808]/90">
          <a
            href={orderBhojanPublic.homeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#FF7A00] px-4 py-3 text-white text-sm font-bold hover:bg-[#E56D00] transition-colors"
          >
            <ShoppingBag size={16} aria-hidden />
            Order Food on OrderBhojan
          </a>
        </div>
      </div>
    </div>
  );
});

export default HeroEcosystemCard;