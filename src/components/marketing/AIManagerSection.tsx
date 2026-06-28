import React, { memo } from 'react';
import { m } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, MessageCircle, BarChart3 } from 'lucide-react';
import { Section } from '../ui/Section';
import { RevealOnScroll } from './RevealOnScroll';
import { aiManagerInsights } from '../../config/landing';
import { MarketingSoftPill } from './MarketingSoftPill';

const typeStyles = {
  success: 'border-emerald-500/20 bg-emerald-500/[0.04]',
  warning: 'border-amber-500/20 bg-amber-500/[0.04]',
  info: 'border-[#FF7A00]/20 bg-[#FF7A00]/[0.04]',
  neutral: 'border-white/[0.08] bg-white/[0.02]',
};

const typeIcon = {
  success: TrendingUp,
  warning: AlertTriangle,
  info: Sparkles,
  neutral: BarChart3,
};

export const AIManagerSection = memo(function AIManagerSection() {
  return (
    <Section id="ai" background="gradient" className="scroll-mt-24">
      <RevealOnScroll className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
        <MarketingSoftPill variant="accent" className="mb-6">
          <Sparkles size={13} className="text-[#FF7A00]" />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#FF7A00]">
            AI Copilot
          </span>
        </MarketingSoftPill>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-3">
          Meet Your AI Restaurant Manager
        </h2>
        <p className="text-base sm:text-lg text-neutral-400 leading-relaxed">
          Morning briefings, stock alerts, campaign drafts, and forecasts — explained clearly with one action to take.
        </p>
      </RevealOnScroll>

      <div className="relative max-w-4xl mx-auto">
        <div
          className="pointer-events-none absolute inset-0 bg-[#FF7A00]/[0.06] blur-[80px] rounded-full"
          aria-hidden
        />

        <div className="relative rounded-[1.75rem] border border-white/[0.08] bg-[#0A0A0A]/90 backdrop-blur-md overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-[#FF7A00]" />
              <span className="text-sm font-semibold text-white">AI Notification Center</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-600">Updated just now</span>
          </div>

          <div className="p-4 sm:p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-h-[520px] overflow-y-auto no-scrollbar">
            {aiManagerInsights.map((item, i) => {
              const Icon = typeIcon[item.type];
              return (
                <m.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className={`rounded-[1.25rem] border p-4 ${typeStyles[item.type]} ${
                    i === 0 ? 'sm:col-span-2 lg:col-span-1 lg:row-span-1' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                      <Icon size={15} className="text-[#FF7A00]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white mb-1">{item.title}</p>
                      <p className="text-xs text-neutral-400 leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                </m.div>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
});

export default AIManagerSection;
