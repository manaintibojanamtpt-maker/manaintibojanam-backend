import React, { memo, useState } from 'react';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { RevealOnScroll } from './RevealOnScroll';
import { StorefrontPreviewMockup } from './StorefrontPreviewMockup';
import { platformFeatures } from '../../config/landing';
import { Bike, Truck, Package, Zap, MapPin, Clock, MessageSquare, ArrowRight } from 'lucide-react';

/* ── 3PL Dispatch Radar — hero bento card ── */
const PARTNERS = [
  { name: 'Rapido', color: '#FACC15', bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.35)', icon: Bike, eta: '6 min', fare: '₹42' },
  { name: 'Porter', color: '#38BDF8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.35)', icon: Truck, eta: '11 min', fare: '₹65' },
  { name: 'Uber Direct', color: '#F8FAFC', bg: 'rgba(248,250,252,0.08)', border: 'rgba(248,250,252,0.28)', icon: Package, eta: '8 min', fare: '₹58' },
  { name: 'In-House', color: '#34D399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.35)', icon: Zap, eta: '4 min', fare: '₹0' },
] as const;

function DispatchRadar() {
  const [activePartner, setActivePartner] = useState(0);
  const p = PARTNERS[activePartner];
  const Icon = p.icon;

  return (
    <div className="cine-glass rounded-2xl border border-white/[0.08] overflow-hidden">
      {/* Route arc */}
      <div className="relative h-28 bg-[#0A0806]/80 flex items-center justify-center overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 112" preserveAspectRatio="none" aria-hidden>
          <path d="M 40 80 C 120 20, 200 90, 360 30" stroke="rgba(217,133,47,0.3)" strokeWidth="2" fill="none" className="svg-beam-flow" vectorEffect="non-scaling-stroke" />
          <circle r="5" fill={p.color} className="cine-particle" style={{ offsetPath: 'path("M 40 80 C 120 20, 200 90, 360 30")', animationDuration: '3s' }} />
        </svg>
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded-full bg-[#D9852F]/20 flex items-center justify-center border border-[#D9852F]/40">
              <MapPin size={14} className="text-[#D9852F]" />
            </div>
            <span className="text-[8px] text-white/50 font-mono">Kitchen</span>
          </div>
          <ArrowRight size={14} className="text-[#D9852F]/60 animate-pulse" aria-hidden />
          <div className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded-full" style={{ background: p.bg, border: `1px solid ${p.border}` }} aria-hidden>
              <Icon size={14} style={{ color: p.color }} aria-hidden />
            </div>
            <span className="text-[8px] text-white/50 font-mono">Customer</span>
          </div>
        </div>
      </div>

      {/* Partner selector */}
      <div className="grid grid-cols-4 gap-1 p-3 border-t border-white/5">
        {PARTNERS.map((part, i) => {
          const Pi = part.icon;
          return (
            <button
              key={part.name}
              onClick={() => setActivePartner(i)}
              className={`flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${activePartner === i ? 'border' : 'border border-transparent text-white/40 hover:text-white/70'}`}
              style={activePartner === i ? { borderColor: part.border, background: part.bg, color: part.color } : undefined}
              aria-pressed={activePartner === i}
            >
              <Pi size={16} />
              <span className="text-[9px]">{part.name}</span>
            </button>
          );
        })}
      </div>

      {/* Active partner info */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: p.bg, color: p.color }}>
              <Icon size={15} />
            </div>
            <span className="text-sm font-bold text-white">{p.name}</span>
          </div>
          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>
            Live
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white/[0.04] p-2 text-center border border-white/[0.05]">
            <Clock size={12} className="mx-auto mb-0.5 text-white/50" aria-hidden />
            <div className="text-[10px] font-bold text-white font-mono">{p.eta}</div>
            <div className="text-[8px] text-white/40">ETA</div>
          </div>
          <div className="rounded-lg bg-white/[0.04] p-2 text-center border border-white/[0.05]">
            <span className="text-[10px] font-bold text-white font-mono">{p.fare}</span>
            <div className="text-[8px] text-white/40">Fare</div>
          </div>
          <div className="rounded-lg bg-white/[0.04] p-2 text-center border border-white/[0.05]">
            <MessageSquare size={12} className="mx-auto mb-0.5 text-white/50" aria-hidden />
            <div className="text-[9px] font-semibold text-white/70">WhatsApp</div>
            <div className="text-[8px] text-white/40">Live Tracking</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Platform Features — hero bento layout.
 * Delivery Management is elevated as a 2-column spotlight card with animated dispatch radar.
 */
export const PlatformFeatures = memo(function PlatformFeatures() {
  const deliveryFeature = platformFeatures.find((f) => f.title === 'Delivery Management');
  const otherFeatures = platformFeatures.filter((f) => f.title !== 'Delivery Management');

  return (
    <Section id="features" background="default" className="scroll-mt-24">
      <SectionHeader
        label="Platform"
        title="Everything your food business needs."
        description="One operating system for your menu, orders, kitchen, inventory, payments and customers. No patchwork of tools."
      />

      <RevealOnScroll>
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
          Customer-facing storefront
        </p>
        <StorefrontPreviewMockup />
      </RevealOnScroll>

      {/* Hero bento: Delivery Management takes 2 columns */}
      {deliveryFeature && (
        <RevealOnScroll delay={0.1}>
          <div className="mt-8 rounded-3xl border border-[#D9852F]/20 bg-gradient-to-br from-[#1a1408] via-[#15120f] to-[#0e0c0a] p-5 sm:p-7 cine-tilt specular-rim shadow-[0_0_60px_-20px_rgba(217,133,47,0.2)]">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center gap-1.5 rounded-full bg-[#D9852F]/15 border border-[#D9852F]/30 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#E8A95E]">
                <Zap size={10} />
                Smart Delivery Dispatch Radar
              </span>
            </div>
            <div className="grid lg:grid-cols-[1fr_1.4fr] gap-5 items-start">
              <div>
                <h3 className="font-display text-xl font-extrabold text-white mb-2">{deliveryFeature.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed mb-4">{deliveryFeature.description}</p>
                <ul className="space-y-2 text-sm text-white/70">
                  {[
                    'One-click dispatch to Rapido, Porter, Uber Direct or In-House Fleet',
                    'Real-time ETA & fare comparison across all partners',
                    'Automated WhatsApp live-tracking to your customer',
                    'Dynamic zone pricing and surge-free flat fares',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <ArrowRight size={14} className="text-[#D9852F] mt-0.5 flex-shrink-0" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <DispatchRadar />
            </div>
          </div>
        </RevealOnScroll>
      )}

      {/* Remaining feature grid — Directoo-style with spotlight + spring hover */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-6">
        {otherFeatures.map(({ icon: Icon, title, description }, i) => (
          <RevealOnScroll key={title} delay={0.05 * (i + 1)}>
            <div className="card-spring-hover card-specular-top card-spotlight group relative h-full marketing-card p-5 sm:p-6 transition-all duration-300 hover:border-[#D9852F]/25">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D9852F]/10 border border-[#D9852F]/20 text-[#D9852F] mb-4">
                  <Icon size={20} strokeWidth={2} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 tracking-tight">{title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{description}</p>
              </div>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </Section>
  );
});

export default PlatformFeatures;
