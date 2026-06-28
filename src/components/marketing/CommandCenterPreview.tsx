import React, { memo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  LockKeyhole, TrendingUp, Database, Users, Activity, Check, AlertCircle,
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { MarketingSoftPill } from './MarketingSoftPill';

export const CommandCenterPreview = memo(function CommandCenterPreview() {
  const [activeTab, setActiveTab] = useState('demand');

  const tabs = [
    { id: 'demand', label: 'Demand Prediction', Icon: TrendingUp },
    { id: 'recipe', label: 'Recipe Intelligence', Icon: Database },
    { id: 'customer', label: 'Customer Graph', Icon: Users },
    { id: 'health', label: 'Kitchen Health', Icon: Activity },
  ] as const;

  return (
    <div className="w-full max-w-5xl mx-auto relative z-10 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.07] rounded-[1.25rem]">
      <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-[1.25rem] overflow-hidden">
        <div className="h-11 border-b border-white/[0.06] flex items-center px-4 sm:px-6 gap-3 bg-[#080808]">
          <div className="flex gap-1.5 shrink-0" aria-hidden>
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
          </div>
          <div className="flex-1 max-w-md mx-auto h-7 rounded-md bg-[#030303] border border-white/[0.06] flex items-center justify-center text-[10px] sm:text-[11px] font-mono text-neutral-500 gap-1.5 px-3 truncate">
            <LockKeyhole size={10} className="shrink-0" />
            <span className="truncate">bhojanos.com/your-kitchen</span>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Product preview"
          className="command-center-tabs marketing-soft-tab-bar sm:mx-6"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <MarketingSoftPill
                key={tab.id}
                as="button"
                variant="tab"
                active={isActive}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab(tab.id);
                }}
              >
                <tab.Icon size={14} strokeWidth={2.25} className="shrink-0" aria-hidden />
                <span className="truncate">{tab.label}</span>
              </MarketingSoftPill>
            );
          })}
        </div>

        <div className="p-5 sm:p-6 min-h-[280px] sm:min-h-[300px] bg-[#080808]">
          <AnimatePresence mode="wait">
            {activeTab === 'demand' && (
              <m.div key="demand" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">Weekend Demand Forecast</h3>
                    <p className="text-sm text-neutral-400">AI projection based on last 4 weekends and weather.</p>
                  </div>
                  <MarketingSoftPill variant="accent">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#FF7A00]">
                      High Confidence
                    </span>
                  </MarketingSoftPill>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-xl p-4">
                    <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Predicted Orders</div>
                    <div className="text-2xl font-bold text-white tabular-nums">450 – 480</div>
                  </div>
                  <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-xl p-4">
                    <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Peak Hour</div>
                    <div className="text-2xl font-bold text-white tabular-nums">7:30 PM</div>
                  </div>
                  <div className="bg-[#0A0A0A] border border-[#FF7A00]/20 rounded-xl p-4">
                    <div className="text-[10px] font-semibold text-[#FF7A00] uppercase tracking-wider mb-1">Recommendation</div>
                    <div className="text-sm font-medium text-neutral-200">Increase Biryani prep by 20%.</div>
                  </div>
                </div>
                <div className="h-32 flex items-end gap-1.5">
                  {[20, 30, 25, 45, 60, 90, 80, 50, 30, 20].map((h, i) => (
                    <div key={i} className="flex-1 h-full flex items-end">
                      <div className="w-full bg-[#FF7A00]/15 rounded-t-sm relative" style={{ height: `${h}%` }}>
                        <div className="absolute top-0 w-full h-0.5 bg-[#FF7A00]" />
                      </div>
                    </div>
                  ))}
                </div>
              </m.div>
            )}

            {activeTab === 'recipe' && (
              <m.div key="recipe" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">Live Inventory Deduction</h3>
                  <p className="text-sm text-neutral-400">Ingredients sync automatically when orders arrive.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {[
                      { title: 'Order #1042 Received', sub: '2x Chicken Biryani', icon: Check, color: 'emerald' },
                      { title: 'Looking up Master Recipe', sub: 'Chicken Biryani (Large)', icon: Database, color: 'neutral' },
                      { title: 'Inventory Impact', sub: 'Deducting from Central Kitchen', icon: Activity, color: 'orange' },
                    ].map((step, i) => (
                      <div key={step.title} className={`bg-[#0A0A0A] border rounded-xl p-4 flex items-center gap-3 ${i === 0 ? 'border-emerald-500/20' : i === 2 ? 'border-[#FF7A00]/20' : 'border-white/[0.06]'}`}>
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${i === 0 ? 'bg-emerald-500/10' : i === 2 ? 'bg-[#FF7A00]/10' : 'bg-white/[0.04]'}`}>
                          <step.icon size={16} className={i === 0 ? 'text-emerald-400' : i === 2 ? 'text-[#FF7A00]' : 'text-neutral-400'} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{step.title}</div>
                          <div className="text-xs text-neutral-500">{step.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[#0A0A0A] rounded-xl border border-white/[0.06] p-5">
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">Live Deductions</h4>
                    {['Basmati Rice|-400g|14.2kg', 'Chicken (Raw)|-600g|8.4kg', 'Spices Blend|-20g|2.1kg'].map((row) => {
                      const [name, delta, rem] = row.split('|');
                      return (
                        <div key={name} className="flex justify-between items-center py-3 border-b border-white/[0.06] last:border-0">
                          <span className="text-sm text-white font-medium">{name}</span>
                          <div className="text-right">
                            <span className="text-sm text-red-400 font-mono block">{delta}</span>
                            <span className="text-xs text-neutral-500 font-mono">{rem} remaining</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </m.div>
            )}

            {activeTab === 'customer' && (
              <m.div key="customer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 bg-[#0A0A0A] border border-white/[0.06] rounded-xl p-5 flex justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-semibold text-neutral-500 uppercase mb-1">Customer: Viswa</div>
                      <div className="text-xl font-semibold text-white mb-1">High Value / Frequent</div>
                      <div className="text-sm text-neutral-400">Last order 2 days ago · Favorite: Butter Chicken</div>
                    </div>
                    <div className="w-14 h-14 rounded-full border-2 border-emerald-500/60 flex items-center justify-center text-emerald-400 font-bold">98</div>
                  </div>
                  <div className="bg-[#0A0A0A] border border-amber-500/20 rounded-xl p-5">
                    <div className="text-[10px] font-semibold text-amber-400 uppercase mb-2">Churn Risk</div>
                    <p className="text-sm text-neutral-200">12 high-value customers inactive 30+ days.</p>
                  </div>
                </div>
              </m.div>
            )}

            {activeTab === 'health' && (
              <m.div key="health" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-xl p-5">
                    <div className="text-[10px] font-semibold text-neutral-500 uppercase mb-3">Prep Latency</div>
                    <div className="text-3xl font-bold text-white tabular-nums">12 <span className="text-base text-neutral-400">min</span></div>
                  </div>
                  <div className="bg-[#0A0A0A] border border-amber-500/20 rounded-xl p-5 flex gap-3">
                    <AlertCircle className="text-amber-400 shrink-0" size={18} />
                    <div>
                      <div className="text-sm font-medium text-white mb-1">Packaging Bottleneck</div>
                      <p className="text-sm text-neutral-400">4.5 min wait at packing station — add 1 staff for 45 min.</p>
                    </div>
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});

export default CommandCenterPreview;
