import React, { memo, useState } from 'react';
import { m } from 'framer-motion';
import {
  Globe,
  QrCode,
  MessageSquare,
  Cpu,
  Truck,
  Users,
  ArrowRight,
  Bike,
  Package,
  Zap,
  MapPin,
  Clock
} from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

/* ── 3PL Dispatch Radar Component ── */
const PARTNERS = [
  { name: 'Shadowfax', color: '#D97706', bg: 'rgba(217,119,6,0.15)', border: 'rgba(217,119,6,0.3)', icon: Bike, eta: '5 min', fare: '₹38' },
  { name: 'Dunzo', color: '#00B0FF', bg: 'rgba(0,176,255,0.15)', border: 'rgba(0,176,255,0.3)', icon: Bike, eta: '7 min', fare: '₹44' },
  { name: 'Porter', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', icon: Truck, eta: '12 min', fare: '₹62' },
  { name: 'In-House', color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', icon: Zap, eta: '4 min', fare: '₹0' },
] as const;

function DispatchRadar() {
  const [activePartner, setActivePartner] = useState(0);
  const p = PARTNERS[activePartner];
  const Icon = p.icon;

  return (
    <div className="rounded-lg border border-[#27272A] bg-[#111114] overflow-hidden shadow-none">
      {/* Route arc visualization — animated beam from kitchen to diner. */}
      <div className="relative h-24 bg-[#09090B] flex items-center justify-center overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 96" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 40 68 C 120 18, 200 78, 360 26" stroke="#27272A" strokeWidth="2" strokeDasharray="4 4" fill="none" vectorEffect="non-scaling-stroke" />
          <m.path
            d="M 40 68 C 120 18, 200 78, 360 26"
            stroke={p.color}
            strokeWidth="2.5"
            fill="none"
            vectorEffect="non-scaling-stroke"
            strokeDasharray="6 8"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -14 }}
            transition={{ duration: 1.4, ease: 'linear', repeat: Infinity }}
          />
        </svg>
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <div className="h-7 w-7 rounded-full bg-[#18181B] flex items-center justify-center border border-[#27272A] shadow-none">
              <MapPin size={13} className="text-[#D97706]" />
            </div>
            <span className="text-[9px] text-zinc-400 font-mono">Kitchen</span>
          </div>
          <ArrowRight size={14} className="text-zinc-600" aria-hidden="true" />
          <div className="flex flex-col items-center gap-1">
            <m.div
              className="h-7 w-7 rounded-full bg-[#18181B] flex items-center justify-center border border-[#27272A] shadow-none"
              whileHover={{ scale: 1.12 }}
              transition={{ duration: 0.2 }}
              aria-hidden="true"
            >
              <Icon size={13} style={{ color: p.color }} aria-hidden="true" />
            </m.div>
            <span className="text-[9px] text-zinc-400 font-mono">Diner</span>
          </div>
        </div>
      </div>

      {/* Partner selector */}
      <div className="grid grid-cols-4 gap-1 p-2 border-t border-[#27272A] bg-[#111114]">
        {PARTNERS.map((part, i) => {
          const Pi = part.icon;
          return (
            <button
              key={part.name}
              type="button"
              onClick={() => setActivePartner(i)}
              className={`flex flex-col items-center gap-1 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activePartner === i ? 'bg-[#18181B] border border-[#27272A] shadow-none' : 'text-zinc-400 hover:text-white'
              }`}
              style={activePartner === i ? { color: part.color } : undefined}
              aria-pressed={activePartner === i}
            >
              <Pi size={15} />
              <span className="text-[9px] font-mono">{part.name}</span>
            </button>
          );
        })}
      </div>

      {/* Active partner info — crossfade between partners, no layout shift. */}
      <div className="p-3 border-t border-[#27272A]">
        <m.div
          key={activePartner}
          initial={{ opacity: 0, translateY: 6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-3 gap-2 text-center text-xs"
        >
          <div className="p-1.5 rounded-md bg-[#18181B] border border-[#27272A]">
            <Clock size={11} className="mx-auto mb-0.5 text-zinc-400" aria-hidden="true" />
            <div className="font-mono font-bold text-white text-[11px]">{p.eta}</div>
            <div className="text-[8px] text-zinc-500 font-mono">ETA</div>
          </div>
          <div className="p-1.5 rounded-md bg-[#18181B] border border-[#27272A]">
            <div className="font-mono font-bold text-white text-[11px]">{p.fare}</div>
            <div className="text-[8px] text-zinc-500 font-mono">Base Fare</div>
          </div>
          <div className="p-1.5 rounded-md bg-[#18181B] border border-[#27272A]">
            <div className="font-semibold text-emerald-400 text-[10px]">Auto-Call</div>
            <div className="text-[8px] text-zinc-500 font-mono">Zero Markup</div>
          </div>
        </m.div>
      </div>
    </div>
  );
}

export const PlatformFeatures = memo(function PlatformFeatures() {
  return (
    <section id="features" data-section="platform-features" className="py-20 sm:py-24 border-b border-[#27272A] bg-[#09090B] text-white scroll-mt-24">
      <div id="platform-features" className="scroll-mt-24" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18181B] border border-[#27272A] shadow-none mb-4">
            <span className="text-xs font-mono font-semibold text-[#D97706] uppercase tracking-wider">
              Autonomous F&amp;B Infrastructure
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#FAFAFA]">
            Six Pillars Built for Kitchen Sovereignty
          </h2>
          <p className="mt-3 text-base text-zinc-400">
            Every touchpoint calibrated for high-turnover peak services, multi-station kitchens, and hyper-loyal diners.
          </p>
        </div>

        {/* Bento Grid — 6 Core Pillars, scroll-triggered staggered reveal. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Pillar 1: Bespoke Storefront */}
          <RevealOnScroll delay={0.05}>
            <div className="p-6 rounded-lg bg-[#18181B] border border-[#27272A] shadow-none flex flex-col justify-between hover:border-[#D97706]/40 hover:shadow-2xl transition-all h-full text-white">
              <div>
                <div className="w-10 h-10 rounded-md bg-[#111114] border border-[#27272A] flex items-center justify-center text-[#D97706] mb-5">
                  <Globe size={20} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Bespoke White-Label Storefront</h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                  Lightning fast mobile-web shop hosted on your custom brand domain. Single-tap checkout via UPI Intent, Apple Pay, cards, and Netbanking. Zero third-party marketplace ads.
                </p>
              </div>
              <div className="pt-4 border-t border-[#27272A] flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>order.yourbrand.com</span>
                <span className="text-emerald-400 font-semibold">Sub-0.8s Load Speed</span>
              </div>
            </div>
          </RevealOnScroll>

          {/* Pillar 2: Dynamic Dine-In Table QR */}
          <RevealOnScroll delay={0.1}>
            <div className="p-6 rounded-lg bg-[#18181B] border border-[#27272A] shadow-none flex flex-col justify-between hover:border-[#D97706]/40 hover:shadow-2xl transition-all h-full text-white">
              <div>
                <div className="w-10 h-10 rounded-md bg-[#111114] border border-[#27272A] flex items-center justify-center text-[#3B82F6] mb-5">
                  <QrCode size={20} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Dynamic Dine-In Table QR</h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                  Replace rigid physical menus. Diners scan, browse high-res photos, split checks with friends, order drinks in 10 seconds, and settle the bill without waiting 15 minutes for staff.
                </p>
              </div>
              <div className="pt-4 border-t border-[#27272A] flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>Table-Level KOT Routing</span>
                <span className="text-emerald-400 font-semibold">+22% Table Turnover</span>
              </div>
            </div>
          </RevealOnScroll>

          {/* Pillar 3: WhatsApp Conversational Commerce */}
          <RevealOnScroll delay={0.15}>
            <div className="p-6 rounded-lg bg-[#18181B] border border-[#27272A] shadow-none flex flex-col justify-between hover:border-[#D97706]/40 hover:shadow-2xl transition-all h-full text-white">
              <div>
                <div className="w-10 h-10 rounded-md bg-[#111114] border border-[#27272A] flex items-center justify-center text-[#10B981] mb-5">
                  <MessageSquare size={20} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">WhatsApp Direct Ordering</h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                  Conversational food checkout directly inside WhatsApp, India’s favorite channel. Diners reorder favorites with 1 tap, receive live delivery pings, and pay via instant UPI deep-links.
                </p>
              </div>
              <div className="pt-4 border-t border-[#27272A] flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>Meta API Compatible</span>
                <span className="text-emerald-400 font-semibold">94% Message Open Rate</span>
              </div>
            </div>
          </RevealOnScroll>

          {/* Pillar 4: Multi-Station KDS & KOT System */}
          <RevealOnScroll delay={0.2}>
            <div className="p-6 rounded-lg bg-[#18181B] border border-[#27272A] shadow-none flex flex-col justify-between hover:border-[#D97706]/40 hover:shadow-2xl transition-all h-full text-white">
              <div>
                <div className="w-10 h-10 rounded-md bg-[#111114] border border-[#27272A] flex items-center justify-center text-[#F59E0B] mb-5">
                  <Cpu size={20} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Multi-Station KDS &amp; KOT System</h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                  Route orders synchronously across Biryani Handi, Tandoor, Pantry, Bar, and Packing desks. Seamless fallback to standard 80mm ESC/POS thermal printers during internet drops.
                </p>
              </div>
              <div className="pt-4 border-t border-[#27272A] flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>Offline-First LAN Sync</span>
                <span className="text-emerald-400 font-semibold">Zero Lost KOTs</span>
              </div>
            </div>
          </RevealOnScroll>

          {/* Pillar 5: Smart 3PL Delivery Dispatcher */}
          <RevealOnScroll delay={0.25}>
            <div className="p-6 rounded-lg bg-[#18181B] border border-[#27272A] shadow-none flex flex-col justify-between hover:border-[#D97706]/40 hover:shadow-2xl transition-all h-full text-white">
              <div>
                <div className="w-10 h-10 rounded-md bg-[#111114] border border-[#27272A] flex items-center justify-center text-[#3B82F6] mb-4">
                  <Truck size={20} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Smart 3PL Delivery Dispatcher</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                  Never worry about in-house fleet limits. Automated dispatch calls Shadowfax, Dunzo, or Porter based on proximity and cheapest instant surge rates.
                </p>
                <DispatchRadar />
              </div>
              <div className="pt-3 mt-3 border-t border-[#27272A] flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>Multi-Fleet Routing</span>
                <span className="text-emerald-400 font-semibold">₹38 Avg Base Delivery</span>
              </div>
            </div>
          </RevealOnScroll>

          {/* Pillar 6: Customer CRM & Retention Engine */}
          <RevealOnScroll delay={0.3}>
            <div className="p-6 rounded-lg bg-[#18181B] border border-[#27272A] shadow-none flex flex-col justify-between hover:border-[#D97706]/40 hover:shadow-2xl transition-all h-full text-white">
              <div>
                <div className="w-10 h-10 rounded-md bg-[#111114] border border-[#27272A] flex items-center justify-center text-[#A855F7] mb-5">
                  <Users size={20} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Automated Guest CRM &amp; Reorders</h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                  Trigger bespoke WhatsApp &amp; SMS retention workflows automatically: 'We miss you' weekend discounts sent at 7:30 PM Friday to diners who haven't ordered in 21 days.
                </p>
              </div>
              <div className="pt-4 border-t border-[#27272A] flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>Direct Diner History</span>
                <span className="text-emerald-400 font-semibold">31% Reorder Rate</span>
              </div>
            </div>
          </RevealOnScroll>

        </div>
      </div>
    </section>
  );
});

export default PlatformFeatures;
