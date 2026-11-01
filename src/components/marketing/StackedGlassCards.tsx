import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type CardDef = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string;
  colorRgba: string;
  stats: { label: string; value: string; delta?: string }[];
  pills: { label: string; color: string }[];
  miniVis: React.ReactNode;
};

const CARDS: CardDef[] = [
  {
    id: 'overview',
    eyebrow: 'Restaurant Overview',
    title: 'Your Restaurant. One Dashboard.',
    subtitle:
      'Get a clear view of your restaurant\'s daily operations, sales, orders, and performance—all from one place.',
    accent: '#D97706',
    colorRgba: 'rgba(217, 119, 6, 0.8)',
    stats: [
      { label: "Today's Sales", value: '₹14,280', delta: '+18%' },
      { label: 'Total Orders', value: '23', delta: 'Live' },
      { label: 'Avg. Order Value', value: '₹620', delta: '+₹45' },
      { label: 'Customer Retention', value: '67%', delta: '+9%' },
    ],
    pills: [
      { label: 'Direct Orders', color: '#059669' },
      { label: 'WhatsApp', color: '#2563EB' },
      { label: 'Table QR', color: '#7C3AED' },
      { label: 'Walk-in', color: '#D97706' },
    ],
    miniVis: (
      <div className="space-y-1.5">
        {[85, 62, 74, 91, 68].map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[9px] text-[#A1A1AA] w-6 font-mono shrink-0">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i]}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D97706]"
                style={{ width: `${v}%` }}
              />
            </div>
            <span className="text-[9px] font-semibold text-white w-7 text-right tabular-nums">
              {v}%
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'orders',
    eyebrow: 'Smart Order Management',
    title: 'Every Order. Under Control.',
    subtitle:
      'Manage incoming orders, track their status, and keep your kitchen and front-of-house operations organized during busy hours.',
    accent: '#059669',
    colorRgba: 'rgba(5, 150, 105, 0.8)',
    stats: [
      { label: 'New Orders', value: '7', delta: 'Incoming' },
      { label: 'Preparing', value: '4', delta: 'Kitchen' },
      { label: 'Ready', value: '3', delta: 'For pickup' },
      { label: 'Completed', value: '12', delta: 'This hour' },
    ],
    pills: [
      { label: 'KDS Live', color: '#059669' },
      { label: 'Auto-Dispatch', color: '#2563EB' },
      { label: 'Rider OTP', color: '#D97706' },
    ],
    miniVis: (
      <div className="flex items-center gap-1.5">
        {[
          { label: 'New', color: '#D97706', done: true },
          { label: 'Preparing', color: '#2563EB', done: true },
          { label: 'Ready', color: '#059669', done: false },
          { label: 'Delivered', color: '#71717A', done: false },
        ].map((s, i, arr) => (
          <div key={s.label} className="flex items-center gap-1.5 flex-1 min-w-0">
            <div
              className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center ${
                s.done ? 'bg-emerald-950/60 border border-emerald-500/40' : 'bg-white/10'
              }`}
            >
              {s.done ? (
                <CheckCircle2 size={11} className="text-[#10B981]" />
              ) : (
                <span className="text-[9px] font-bold text-[#A1A1AA]">{i + 1}</span>
              )}
            </div>
            <span
              className={`text-[9px] font-medium truncate ${
                s.done ? 'text-[#10B981]' : 'text-[#A1A1AA]'
              }`}
            >
              {s.label}
            </span>
            {i < arr.length - 1 && (
              <div
                className={`w-3 h-px shrink-0 ${s.done ? 'bg-[#10B981]' : 'bg-white/10'}`}
              />
            )}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'menu',
    eyebrow: 'Digital Menu & QR Ordering',
    title: 'Let Customers Order Their Way.',
    subtitle:
      'Share your digital menu, enable QR-based ordering, and make it easier for customers to discover your menu and place orders.',
    accent: '#7C3AED',
    colorRgba: 'rgba(124, 58, 237, 0.8)',
    stats: [
      { label: 'Menu Views', value: '1,842', delta: 'This week' },
      { label: 'QR Orders', value: '347', delta: '+22%' },
      { label: 'WhatsApp Orders', value: '189', delta: 'Direct' },
      { label: 'Conversion Rate', value: '38%', delta: '+5%' },
    ],
    pills: [
      { label: 'Table QR', color: '#7C3AED' },
      { label: 'WhatsApp', color: '#2563EB' },
      { label: 'Instant Pay', color: '#059669' },
    ],
    miniVis: (
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Starters', count: '14 items', available: true },
          { label: 'Main Course', count: '28 items', available: true },
          { label: 'Desserts', count: '8 items', available: false },
        ].map((cat) => (
          <div
            key={cat.label}
            className="rounded border border-white/10 bg-white/[0.04] p-1.5"
          >
            <div className="text-[10px] font-semibold text-white truncate">{cat.label}</div>
            <div className="text-[9px] text-[#A1A1AA]">{cat.count}</div>
            <span
              className={`inline-block text-[8px] font-mono mt-0.5 ${
                cat.available ? 'text-[#10B981]' : 'text-[#A1A1AA]'
              }`}
            >
              {cat.available ? '● Active' : '○ 86\'d'}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'pos',
    eyebrow: 'Intelligent POS & Billing',
    title: 'Fast Billing. Zero Friction.',
    subtitle:
      'Generate bills with minimal clicks, apply discounts easily, and handle split payments seamlessly across tables and takeouts.',
    accent: '#2563EB',
    colorRgba: 'rgba(37, 99, 235, 0.8)',
    stats: [
      { label: 'Avg. Bill Time', value: '8 sec', delta: 'Rapid' },
      { label: 'Cash/UPI Split', value: '15/85%', delta: 'Digital' },
      { label: 'Discount Errors', value: '0', delta: 'Strict' },
      { label: 'Void Requests', value: '<0.5%', delta: 'Audited' },
    ],
    pills: [
      { label: 'Split Bills', color: '#2563EB' },
      { label: 'Auto-Discounts', color: '#059669' },
      { label: 'Offline Mode', color: '#D97706' },
    ],
    miniVis: (
      <div className="space-y-1 font-mono text-[9px]">
        <div className="flex justify-between text-[#A1A1AA] border-b border-white/10 pb-1">
          <span>Table 4 · Split (2 pax)</span>
          <span className="text-[#10B981] font-semibold">PAID UPI</span>
        </div>
        <div className="flex justify-between text-white">
          <span>Guest A · Paneer Tikka + Naan</span>
          <span>₹380</span>
        </div>
        <div className="flex justify-between text-white">
          <span>Guest B · Dal Makhani + Rice</span>
          <span>₹340</span>
        </div>
        <div className="flex justify-between text-[#D97706] font-bold pt-0.5 border-t border-white/10">
          <span>Total (GST incl.)</span>
          <span>₹720</span>
        </div>
      </div>
    ),
  },
  {
    id: 'delivery',
    eyebrow: 'Delivery Fleet Automation',
    title: 'Delivery Dispatched in 30 Seconds.',
    subtitle:
      'Automatically assign orders to the best-rated third-party delivery partners without manual phone calls or delay.',
    accent: '#D97706',
    colorRgba: 'rgba(217, 119, 6, 0.8)',
    stats: [
      { label: 'Fleet Match', value: '28 sec', delta: 'Auto' },
      { label: 'Active Couriers', value: '3 integrated', delta: 'Live' },
      { label: 'On-Time Rate', value: '94.2%', delta: '+6.1%' },
      { label: 'Transit Time', value: '21 min', delta: 'Avg' },
    ],
    pills: [
      { label: 'Shadowfax', color: '#059669' },
      { label: 'Dunzo', color: '#2563EB' },
      { label: 'Borzo', color: '#7C3AED' },
    ],
    miniVis: (
      <div className="flex items-center justify-between gap-2 p-1.5 rounded border border-white/10 bg-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px]">
            🛵
          </div>
          <div>
            <div className="text-[10px] font-bold text-white">Shadowfax #9201</div>
            <div className="text-[8px] text-[#10B981]">Picked up · 4 mins to customer</div>
          </div>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-[#10B981] border border-emerald-500/30">
          OTP 4912
        </span>
      </div>
    ),
  },
];

interface GlassCardProps {
  card: CardDef;
  index: number;
  totalCards: number;
}

const ProperGlassCard: React.FC<GlassCardProps> = ({ card, index, totalCards }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cardEl = cardRef.current;
    const containerEl = containerRef.current;
    if (!cardEl || !containerEl) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const targetScale = 1 - (totalCards - index) * 0.04;

    gsap.set(cardEl, {
      scale: 1,
      transformOrigin: 'center top',
    });

    const trigger = ScrollTrigger.create({
      trigger: containerEl,
      start: 'top center',
      end: 'bottom center',
      scrub: 1,
      onUpdate: (self) => {
        const progress = self.progress;
        const scale = gsap.utils.interpolate(1, targetScale, progress);
        gsap.set(cardEl, {
          scale: Math.max(scale, targetScale),
          transformOrigin: 'center top',
        });
      },
    });

    return () => {
      trigger.kill();
    };
  }, [index, totalCards]);

  const color = card.colorRgba;

  return (
    <div
      ref={containerRef}
      className="sticky top-0 h-[100vh] flex items-center justify-center pointer-events-auto"
    >
      <div
        ref={cardRef}
        style={{
          position: 'relative',
          width: 'min(92vw, 840px)',
          minHeight: '460px',
          borderRadius: '24px',
          isolation: 'isolate',
          top: `calc(-5vh + ${index * 22}px)`,
          transformOrigin: 'top center',
        }}
        className="card-content transition-shadow duration-300 group"
      >
        {/* Electric Conic Border Effect */}
        <div
          style={{
            position: 'absolute',
            inset: '-2.5px',
            borderRadius: '26.5px',
            padding: '2.5px',
            background: `conic-gradient(
              from 0deg,
              transparent 0deg,
              ${color} 60deg,
              ${color.replace('0.8', '0.5')} 120deg,
              transparent 180deg,
              ${color.replace('0.8', '0.35')} 240deg,
              transparent 360deg
            )`,
            zIndex: -1,
          }}
        />

        {/* Main Card Multi-Layer Skeuomorphic Frosted Glass */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            minHeight: '460px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRadius: '24px',
            background: `
              linear-gradient(145deg, 
                rgba(255, 255, 255, 0.08) 0%, 
                rgba(255, 255, 255, 0.02) 100%
              ),
              #111115
            `,
            backdropFilter: 'blur(28px) saturate(190%)',
            WebkitBackdropFilter: 'blur(28px) saturate(190%)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            boxShadow: `
              0 24px 60px rgba(0, 0, 0, 0.8),
              0 4px 12px rgba(0, 0, 0, 0.5),
              inset 0 1px 0 rgba(255, 255, 255, 0.28),
              inset 0 -1px 0 rgba(255, 255, 255, 0.08)
            `,
            overflow: 'hidden',
          }}
        >
          {/* Enhanced Glass reflection overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '55%',
              background:
                'linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.05) 45%, transparent 100%)',
              pointerEvents: 'none',
              borderRadius: '24px 24px 0 0',
            }}
          />

          {/* Top shine line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '5%',
              right: '5%',
              height: '1px',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.45) 50%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* Left subtle side reflection */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '1px',
              background:
                'linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 60%)',
              borderRadius: '24px 0 0 24px',
              pointerEvents: 'none',
            }}
          />

          {/* Frosted glass radial texture */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `
                radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06) 1px, transparent 2px),
                radial-gradient(circle at 80% 70%, rgba(255,255,255,0.05) 1px, transparent 2px),
                radial-gradient(circle at 40% 80%, rgba(255,255,255,0.04) 1px, transparent 2px)
              `,
              backgroundSize: '32px 32px, 26px 26px, 38px 38px',
              pointerEvents: 'none',
              borderRadius: '24px',
              opacity: 0.65,
            }}
          />

          {/* Top accent glow line */}
          <div
            className="h-1.5 w-full relative z-10"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${card.accent} 50%, transparent 100%)`,
            }}
          />

          {/* Card Interior Content */}
          <div className="relative z-10 p-5 sm:p-7 md:p-8 flex flex-col justify-between flex-1">
            <div>
              {/* Eyebrow & Index Badge */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] px-2.5 py-1 rounded-full border"
                  style={{
                    background: `${card.accent}18`,
                    color: card.accent,
                    borderColor: `${card.accent}35`,
                  }}
                >
                  {card.eyebrow}
                </span>
                <span className="text-[11px] font-mono text-[#A1A1AA] flex items-center gap-1">
                  <span>Stack {index + 1} of {totalCards}</span>
                </span>
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight mb-2 tracking-tight">
                {card.title}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6 max-w-2xl font-normal">
                {card.subtitle}
              </p>

              {/* Stat Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
                {card.stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-3 transition-colors hover:border-white/20"
                  >
                    <div className="text-[10px] text-zinc-400 mb-1 truncate">{s.label}</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base sm:text-lg font-bold text-white tabular-nums tracking-tight">
                        {s.value}
                      </span>
                      {s.delta && (
                        <span className="text-[9px] font-semibold text-[#10B981] tabular-nums">
                          {s.delta}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pills */}
              <div className="flex flex-wrap gap-1.5 mb-6">
                {card.pills.map((p) => (
                  <span
                    key={p.label}
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border backdrop-blur-xs"
                    style={{
                      background: `${p.color}15`,
                      color: p.color,
                      borderColor: `${p.color}35`,
                    }}
                  >
                    {p.label}
                  </span>
                ))}
              </div>

              {/* Live Interactive Visualization */}
              <div className="rounded-xl border border-white/10 p-3.5 bg-black/40 backdrop-blur-md">
                {card.miniVis}
              </div>
            </div>

            {/* Bottom Footer Action */}
            <div className="pt-4 mt-6 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
                <Clock size={12} className="text-[#10B981]" />
                Live Sync · Real-time telemetry
              </span>
              <a
                href="/owner/register"
                className="inline-flex items-center gap-1.5 text-xs font-bold transition-all hover:scale-105"
                style={{ color: card.accent }}
                aria-label={`Explore ${card.title}`}
              >
                <span>Deploy Engine</span>
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function StackedGlassCards() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      id="capabilities"
      className="relative bg-[#09090B] border-y border-[#27272A] text-white"
      aria-label="Platform capabilities"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-[#D97706]/5 rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center pt-24 pb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.12] mb-4">
            <Sparkles size={12} className="text-[#D97706]" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#D97706]">
              Skeuomorphic Glass Stacking
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#FAFAFA] tracking-tight leading-tight">
            Everything Your Restaurant Needs.{' '}
            <span className="bg-gradient-to-r from-[#D97706] to-[#F59E0B] bg-clip-text text-transparent">
              All in One Place.
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Scroll down to inspect the 5 operational layers of BhojanOS. As you scroll, cards stack seamlessly; scroll back up to unstack.
          </p>
          <div className="mt-5 flex items-center justify-center gap-1 text-xs font-semibold text-[#D97706] animate-bounce">
            <span>Scroll to Stack Cards</span>
            <span>↓</span>
          </div>
        </div>

        {/* 100vh Sticky Stacking Cards Container */}
        <div className="relative pb-24">
          {CARDS.map((card, index) => (
            <ProperGlassCard
              key={card.id}
              card={card}
              index={index}
              totalCards={CARDS.length}
            />
          ))}
        </div>

        {/* Footer Note */}
        <div className="py-12 text-center border-t border-white/10">
          <p className="text-xs text-zinc-400">
            All dashboards are live telemetry, not mockups.{' '}
            <a
              href="/owner/register"
              className="font-semibold text-[#D97706] hover:underline"
            >
              Start your free kitchen OS →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

export default StackedGlassCards;
