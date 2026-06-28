import React, { memo, useEffect, useState } from 'react';
import { m } from 'framer-motion';
import {
  TrendingUp,
  ShoppingBag,
  ChefHat,
  Package,
  Truck,
  MessageCircle,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';

const REVENUE_BARS = [32, 45, 38, 52, 48, 68, 72, 65, 78, 84, 76, 92];

const StatTile = memo(function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  delay: number;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`marketing-stat-tile-soft ${accent ? 'marketing-stat-tile-soft--accent' : ''}`}
    >
      <div className="marketing-stat-tile-soft-inner h-full">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            accent ? 'bg-[#FF7A00]/15 text-[#FF7A00]' : 'bg-white/[0.05] text-neutral-400'
          }`}
        >
          <Icon size={14} strokeWidth={2.25} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{label}</span>
      </div>
      <div className="text-lg sm:text-xl font-black text-white tabular-nums">{value}</div>
      {sub && <p className="text-[10px] text-neutral-500 mt-0.5">{sub}</p>}
      </div>
    </m.div>
  );
});

export const LiveDashboardPreview = memo(function LiveDashboardPreview({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setActive(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const revenue = useCountUp(18420, 2000, active);
  const orders = useCountUp(67, 1600, active);
  const preparing = useCountUp(8, 1200, active);
  const alerts = useCountUp(2, 1000, active);
  const deliveries = useCountUp(12, 1400, active);
  const suggestions = useCountUp(8, 1500, active);

  return (
    <div className="relative w-full marketing-hero-enter" aria-label="Live restaurant dashboard preview">
      <div
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[#FF7A00]/[0.08] blur-3xl"
        aria-hidden
      />

      <m.div
        animate={compact ? undefined : { y: [0, -6, 0] }}
        transition={compact ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative marketing-hero-glass-card rounded-[1.35rem] sm:rounded-[1.75rem] border border-white/[0.08] overflow-hidden shadow-[0_32px_64px_-24px_rgba(0,0,0,0.75)]"
      >
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/[0.06] bg-[#080808]/90">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] font-semibold text-neutral-400">Live Dashboard</span>
          </div>
          <span className="text-[10px] font-mono text-neutral-600">bhojanos.com/your-kitchen</span>
        </div>

        <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4 bg-[#0A0A0A]/95">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <StatTile
              icon={TrendingUp}
              label="Today's Revenue"
              value={`₹${revenue.toLocaleString('en-IN')}`}
              accent
              delay={0.2}
            />
            <StatTile icon={ShoppingBag} label="Orders" value={String(orders)} delay={0.28} />
            <StatTile icon={ChefHat} label="Kitchen" value={`Preparing ${preparing}`} delay={0.36} />
            {!compact && (
              <>
                <StatTile
                  icon={Package}
                  label="Inventory"
                  value={`${alerts} Alerts`}
                  sub="Paneer, spices"
                  delay={0.44}
                />
                <StatTile icon={Truck} label="Delivery" value={`${deliveries} Active`} delay={0.52} />
                <StatTile icon={MessageCircle} label="WhatsApp" value="Connected" delay={0.6} />
              </>
            )}
            <StatTile
              icon={Sparkles}
              label="AI Copilot"
              value={compact ? `${suggestions} tips` : `${suggestions} Suggestions`}
              accent
              delay={0.76}
            />
          </div>

          {!compact && (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-3 rounded-[1.25rem] border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Revenue</span>
                <span className="text-[10px] text-emerald-400 font-semibold">+18%</span>
              </div>
              <div className="flex items-end gap-1 h-20">
                {REVENUE_BARS.map((h, i) => (
                  <m.div
                    key={i}
                    className="flex-1 flex items-end h-full"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.8 + i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    style={{ originY: 1 }}
                  >
                    <div
                      className="w-full rounded-t-sm bg-gradient-to-t from-[#FF7A00]/20 to-[#FF7A00]"
                      style={{ height: `${h}%` }}
                    />
                  </m.div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 rounded-[1.25rem] border border-amber-500/20 bg-amber-500/[0.04] p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-white mb-1">Inventory alert</p>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Paneer below threshold. Reorder before Friday lunch.
                  </p>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </m.div>
    </div>
  );
});

export default LiveDashboardPreview;
