import React from 'react';
import { Store, Smartphone, User, ChefHat, ArrowDown } from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

/**
 * Connected Food Ecosystem V2 — visual flow with animated order particles.
 * RESTAURANT → BHOJANOS → ORDERBHOJAN → CUSTOMER
 */

function Connector({ label, pathD }: { label: string; pathD: string }) {
  return (
    <div className="relative flex items-center justify-center max-md:py-6" aria-hidden="true">
      <span className="absolute max-md:rotate-90 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D97706]/70">
        {label}
      </span>
      <svg
        width="120"
        height="40"
        viewBox="0 0 120 40"
        fill="none"
        className="max-md:h-8 max-md:w-[120px] max-md:rotate-90"
      >
        <path
          d={pathD}
          stroke="rgba(217,119,6,0.35)"
          strokeWidth="1.5"
          fill="none"
          className="svg-beam-flow"
        />
        <circle r="3.5" fill="#D97706" className="cine-particle" style={{ offsetPath: `path("${pathD}")`, animationDuration: '2.8s' }} />
        <circle
          r="6"
          fill="rgba(245,158,11,0.25)"
          className="cine-particle"
          style={{ offsetPath: `path("${pathD}")`, animationDelay: '1.2s', animationDuration: '3.2s' }}
        />
      </svg>
    </div>
  );
}

function VerticalConnector({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-4" aria-hidden="true">
      <ArrowDown size={16} className="text-[#D97706]" />
      <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#D97706]/70 font-mono">
        {label}
      </span>
    </div>
  );
}

function StageLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#D97706]/15 text-[#D97706]">
        {icon}
      </span>
      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A1A1AA] font-mono">{title}</span>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="rounded-lg border border-[#27272A] bg-[#18181B] p-4 min-h-[240px] flex flex-col shadow-xl text-white">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
        <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
        <span className="h-2 w-2 rounded-full bg-[#10B981]" />
        <span className="ml-2 text-[10px] font-semibold tracking-wide text-zinc-400 font-mono">
          BhojanOS · Command Center
        </span>
      </div>
      <div className="mb-2 grid grid-cols-3 gap-1.5">
        {([['Orders', '48'], ['Sales', '₹18,450'], ['New', '25']] as [string, string][]).map(([k, v]) => (
          <div key={k} className="rounded-md bg-[#111114] px-2 py-1.5 border border-[#27272A]">
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">{k}</div>
            <div className="text-[13px] font-bold text-white">{v}</div>
          </div>
        ))}
      </div>
      <div className="mb-2 flex gap-1.5">
        {([
          ['Incoming', 'bg-white/10 text-zinc-300'],
          ['Preparing', 'bg-[#D97706]/20 text-[#D97706] border border-[#D97706]/30'],
          ['Ready', 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'],
        ] as [string, string][]).map(([s, c]) => (
          <span key={s} className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${c}`}>
            {s}
          </span>
        ))}
      </div>
      {([
        ['#1042', 'Full Dashboard', '₹18,450', 'Live'],
        ['#1041', 'AI Insights', 'Active', 'Ready'],
      ] as [string, string, string, string][]).map(([id, item, amt, st]) => (
        <div
          key={id}
          className="mb-1.5 flex items-center justify-between rounded-md bg-[#111114] px-2.5 py-2 border border-[#27272A]"
        >
          <div>
            <div className="text-[10px] font-semibold text-white">{item}</div>
            <div className="text-[9px] text-zinc-500 font-mono">{id}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold text-white">{amt}</div>
            <div className={`text-[9px] font-semibold ${st === 'Preparing' ? 'text-[#D97706]' : 'text-emerald-400'}`}>
              {st}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[170px] rounded-[22px] p-2 border border-[#27272A] bg-[#18181B] shadow-xl">
      <div className="rounded-[16px] bg-[#111114] border border-[#27272A] p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold text-white">BhojanOS</span>
          <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400 border border-emerald-500/25">
            Active
          </span>
        </div>
        <div className="mb-1.5 flex items-center justify-between text-[9px]">
          <span className="font-semibold text-zinc-300">Dashboard</span>
          <span className="font-bold text-emerald-400">Live</span>
        </div>
        <div className="flex h-7 items-center justify-center rounded-full bg-[#D97706] text-[10px] font-bold text-white shadow-md shadow-[#D97706]/20">
          View Dashboard
        </div>
      </div>
    </div>
  );
}

function PlatformCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg p-4 border border-[#27272A] bg-[#18181B] min-h-[240px] justify-center shadow-xl text-white">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#D97706]/15 text-[#D97706] border border-[#D97706]/25">
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-bold text-white mb-1">{title}</div>
        <div className="text-[9px] text-zinc-400 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

const H_PATH = 'M2 20 C 30 5, 60 35, 110 20';

export function EcosystemVisual() {
  const scrollRef = useScrollReveal<HTMLDivElement>();

  return (
    <section
      className="relative overflow-hidden py-20 sm:py-24 bg-[#09090B] border-b border-[#27272A] text-white"
      aria-labelledby="ecosystem-heading"
      ref={scrollRef}
    >
      {/* Ambient gradient glow for depth */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#D97706]/[0.03] to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-[#D97706]/[0.05] blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center cine-reveal">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#D97706] font-mono">
            How it works
          </p>
          <h2
            id="ecosystem-heading"
            className="font-display text-3xl font-extrabold tracking-tight text-[#FAFAFA] sm:text-5xl"
          >
            One connected ecosystem
          </h2>
        </div>

        {/* Desktop: horizontal flow with animated particles */}
        <div className="hidden items-stretch md:grid md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-4">
          <div className="flex flex-col gap-3 cine-reveal">
            <StageLabel icon={<Store size={13} />} title="Restaurant" />
            <PlatformCard icon={<Store size={13} />} title="Your Kitchen" desc="Cloud kitchen, hotel, or restaurant — any food business fits." />
          </div>
          <Connector label="Orders in" pathD={H_PATH} />
          <div className="flex flex-col gap-3 cine-reveal" style={{ animationDelay: '120ms' }}>
            <StageLabel icon={<ChefHat size={13} />} title="BhojanOS" />
            <DashboardMockup />
          </div>
          <Connector label="Direct" pathD={H_PATH} />
          <div className="flex flex-col gap-3 cine-reveal" style={{ animationDelay: '240ms' }}>
            <StageLabel icon={<Smartphone size={13} />} title="OrderBhojan" />
            <div className="flex flex-1 items-center">
              <PhoneMockup />
            </div>
          </div>
          <Connector label="Delivered" pathD={H_PATH} />
          <div className="flex flex-col gap-3 cine-reveal" style={{ animationDelay: '360ms' }}>
            <StageLabel icon={<User size={13} />} title="Customer" />
            <PlatformCard icon={<User size={13} />} title="Your Customer" desc="Loyal patrons who return because of your brand, not an app." />
          </div>
        </div>

        {/* Mobile: vertical flow */}
        <div className="flex flex-col md:hidden">
          <div className="flex flex-col gap-3 cine-reveal">
            <StageLabel icon={<Store size={13} />} title="Restaurant" />
            <PlatformCard icon={<Store size={13} />} title="Your Kitchen" desc="Cloud kitchen, hotel, or restaurant — any food business fits." />
          </div>
          <VerticalConnector label="Orders in" />
          <div className="flex flex-col gap-3 cine-reveal">
            <StageLabel icon={<ChefHat size={13} />} title="BhojanOS" />
            <DashboardMockup />
          </div>
          <VerticalConnector label="Direct" />
          <div className="flex flex-col gap-3 cine-reveal">
            <StageLabel icon={<Smartphone size={13} />} title="OrderBhojan" />
            <PhoneMockup />
          </div>
          <VerticalConnector label="Delivered" />
          <div className="flex flex-col gap-3 cine-reveal">
            <StageLabel icon={<User size={13} />} title="Customer" />
            <PlatformCard icon={<User size={13} />} title="Your Customer" desc="Loyal patrons who return because of your brand, not an app." />
          </div>
        </div>
      </div>
    </section>
  );
}

export default EcosystemVisual;
