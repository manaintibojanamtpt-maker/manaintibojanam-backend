import React from 'react';
import { Store, Smartphone, User, ChefHat, ArrowDown } from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

/**
 * Connected Food Ecosystem V2 — visual flow with animated order particles.
 * RESTAURANT → BHOJANOS → ORDERBHOJAN → CUSTOMER
 */

function Connector({ label, pathD }: { label: string; pathD: string }) {
  return (
    <div className="relative flex items-center justify-center max-md:py-6" aria-hidden>
      <span className="absolute max-md:rotate-90 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D9852F]/70">
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
          stroke="rgba(217,133,47,0.35)"
          strokeWidth="1.5"
          fill="none"
          className="svg-beam-flow"
        />
        <circle r="3.5" fill="#D9852F" className="cine-particle" style={{ offsetPath: `path("${pathD}")`, animationDuration: '2.8s' }} />
        <circle
          r="6"
          fill="rgba(232,169,94,0.25)"
          className="cine-particle"
          style={{ offsetPath: `path("${pathD}")`, animationDelay: '1.2s', animationDuration: '3.2s' }}
        />
      </svg>
    </div>
  );
}

function VerticalConnector({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-4" aria-hidden>
      <ArrowDown size={16} className="text-[#D9852F]" />
      <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#D9852F]/60">
        {label}
      </span>
    </div>
  );
}

function StageLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#D9852F]/12 text-[#D9852F]">
        {icon}
      </span>
      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">{title}</span>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="cine-glass flex h-full min-h-[240px] flex-col rounded-2xl p-3.5 border border-white/[0.06]">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-[#D9852F]/60" />
        <span className="ml-2 text-[10px] font-semibold tracking-wide text-white/50">
          BhojanOS · Command Center
        </span>
      </div>
      <div className="mb-2 grid grid-cols-3 gap-1.5">
        {([['Orders', '48'], ['Sales', '₹18,450'], ['New', '25']] as [string, string][]).map(([k, v]) => (
          <div key={k} className="rounded-lg bg-white/[0.04] px-2 py-1.5 border border-white/[0.04]">
            <div className="text-[9px] uppercase tracking-wider text-white/40">{k}</div>
            <div className="text-[13px] font-bold text-white">{v}</div>
          </div>
        ))}
      </div>
      <div className="mb-2 flex gap-1.5">
        {([
          ['Incoming', 'bg-white/[0.06] text-white/60'],
          ['Preparing', 'bg-[#D9852F]/15 text-[#D9852F]'],
          ['Ready', 'bg-[#34D399]/15 text-[#34D399]'],
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
          className="mb-1.5 flex items-center justify-between rounded-lg bg-white/[0.04] px-2.5 py-2 border border-white/[0.03]"
        >
          <div>
            <div className="text-[10px] font-semibold text-white/85">{item}</div>
            <div className="text-[9px] text-white/40">{id}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold text-white">{amt}</div>
            <div className={`text-[9px] font-semibold ${st === 'Preparing' ? 'text-[#D9852F]' : 'text-[#34D399]'}`}>
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
    <div className="cine-glass cine-glass-accent cine-float-soft cine-phone-hover relative mx-auto w-full max-w-[170px] rounded-[22px] p-2 border border-white/[0.08]">
      <div className="rounded-[16px] bg-[#0A0A0A] p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold text-white">BhojanOS</span>
          <span className="rounded-full bg-[#34D399]/15 px-1.5 py-0.5 text-[8px] font-bold text-[#34D399]">
            Active
          </span>
        </div>
        <div className="mb-1.5 flex items-center justify-between text-[9px]">
          <span className="font-semibold text-white/85">Dashboard</span>
          <span className="font-bold text-[#34D399]">Live</span>
        </div>
        <div className="flex h-7 items-center justify-center rounded-lg bg-gradient-to-r from-[#D9852F] to-[#D9852F] text-[10px] font-bold text-black">
          View Dashboard
        </div>
      </div>
    </div>
  );
}

function PlatformCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="cine-glass flex flex-col gap-2 rounded-2xl p-3.5 border border-white/[0.06] min-h-[240px] justify-center">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D9852F]/12 text-[#D9852F]">
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-bold text-white mb-1">{title}</div>
        <div className="text-[9px] text-white/50 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

const H_PATH = 'M2 20 C 30 5, 60 35, 110 20';

export function EcosystemVisual() {
  const scrollRef = useScrollReveal<HTMLDivElement>();

  return (
    <section
      className="relative overflow-hidden py-20 sm:py-24"
      aria-labelledby="ecosystem-heading"
      ref={scrollRef}
    >
      {/* Ambient gradient glow for depth */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#D9852F]/[0.03] to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-[#D9852F]/[0.04] blur-[120px]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center cine-reveal">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#D9852F]">
            How it works
          </p>
          <h2
            id="ecosystem-heading"
            className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl"
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

        <p className="mt-10 text-center text-sm font-semibold text-white/60 cine-reveal">
          Orders flow directly.{' '}
          <span className="text-[#D9852F]">Customers stay yours.</span>
        </p>
      </div>
    </section>
  );
}

export default EcosystemVisual;
