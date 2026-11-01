import React, { useState } from 'react';
import { 
  Percent, 
  Database, 
  Wallet, 
  Truck, 
  TrendingUp, 
  ShieldCheck, 
  Bike, 
  MessageSquare,
  Flame,
} from 'lucide-react';
import { CinematicHero } from '../ui/cinematic-landing-hero';
import { AnimatedTabs } from '../ui/animated-tabs';

export function MarketingHero() {
  const [ticketState, setTicketState] = useState<'cooking' | 'packing' | 'dispatched'>('cooking');
  const [handoverDone, setHandoverDone] = useState(false);

  return (
    <div className="relative w-full bg-[#09090B]">
      {/* 3D Cinematic Scroll Hero */}
      <CinematicHero
        brandName="BHOJANOS"
        tagline1="Your Restaurant."
        tagline2="Your BhojanOS."
        cardHeading="Restaurant Operations, Redefined."
        cardDescription={
          <>
            <span className="text-white font-semibold">BhojanOS</span> powers independent restaurants with direct ordering, kitchen terminal routing, zero commissions, and real-time sales intelligence.
          </>
        }
        metricValue={100}
        metricLabel="% Sovereign"
        ctaHeading="Ready to grow your restaurant?"
        ctaDescription="Join hundreds of modern restaurants taking back control of their direct orders, customer data, and margins today."
        primaryCtaText="Start Your Restaurant"
        primaryCtaHref="/owner/register"
        secondaryCtaText="Explore Platform"
        secondaryCtaHref="#kds"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-16 pb-20 border-b border-[#27272A]">
        {/* 4 VALUE LEDGER CHIPS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-12 max-w-5xl mx-auto text-left">
          <div className="p-3.5 rounded-md bg-[#161922] border border-[#2A2E39] shadow-md flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#0F1117] border border-[#2A2E39] flex items-center justify-center text-[#D97706] shrink-0">
              <Percent size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">0% Take Rate</div>
              <div className="text-[11px] text-zinc-400">Forever sovereign platform</div>
            </div>
          </div>

          <div className="p-3.5 rounded-md bg-[#161922] border border-[#2A2E39] shadow-md flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#0F1117] border border-[#2A2E39] flex items-center justify-center text-[#10B981] shrink-0">
              <Database size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">100% Data Sovereignty</div>
              <div className="text-[11px] text-zinc-400">Real phone numbers &amp; history</div>
            </div>
          </div>

          <div className="p-3.5 rounded-md bg-[#161922] border border-[#2A2E39] shadow-md flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#0F1117] border border-[#2A2E39] flex items-center justify-center text-[#F59E0B] shrink-0">
              <Wallet size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">T+0 Direct UPI Payouts</div>
              <div className="text-[11px] text-zinc-400">Immediate credit to your bank</div>
            </div>
          </div>

          <div className="p-3.5 rounded-md bg-[#161922] border border-[#2A2E39] shadow-md flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#0F1117] border border-[#2A2E39] flex items-center justify-center text-[#3B82F6] shrink-0">
              <Truck size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Auto 3PL Fleet Routing</div>
              <div className="text-[11px] text-zinc-400">Shadowfax, Dunzo, Porter</div>
            </div>
          </div>
        </div>

        {/* FLAGSHIP HERO PRODUCT CENTERPIECE: THE KITCHEN COMMAND DECK */}
        <div id="kds" className="w-full max-w-6xl mx-auto scroll-mt-28 text-left">
          <div className="rounded-lg bg-[#0F1117] text-[#FFFFFF] border border-[#2A2E39] shadow-2xl overflow-hidden hardware-bezel">

            {/* Ambient breathing glow behind the bezel */}
            <div className="pointer-events-none absolute -inset-px rounded-lg opacity-70" aria-hidden="true">
              <div className="w-full h-full rounded-lg bg-gradient-to-b from-[#D97706]/[0.08] via-transparent to-emerald-500/[0.05] blur-3xl" />
            </div>

            {/* Terminal hardware bar */}
            <div className="px-5 py-3.5 border-b border-[#2A2E39] bg-[#161922] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]/80 inline-block" />
                </div>
                <div className="h-4 w-px bg-[#2A2E39]" aria-hidden="true" />
                <span className="font-mono font-semibold tracking-wider text-slate-200">
                  BHOJAN-KDS // STATION-01
                </span>
                <span className="text-[#A1A1AA] hidden sm:inline">· Indiranagar Cloud Kitchen #4</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE · ROUTING ACTIVE
                </span>
              </div>
            </div>

            {/* KDS Operations Grid */}
            <div className="p-6 sm:p-8 space-y-6">

              {/* Status Ribbon: Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-md bg-[#161922] border border-[#2A2E39]">
                  <div className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-wider">Active Direct Orders</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-white">18</span>
                    <span className="text-xs text-emerald-400 font-mono flex items-center">
                      <TrendingUp size={12} className="inline mr-0.5" /> +42% YoY
                    </span>
                  </div>
                </div>
                <div className="p-3.5 rounded-md bg-[#161922] border border-[#2A2E39]">
                  <div className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-wider">Avg Prep Time</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-white">9m 40s</span>
                    <span className="text-xs text-emerald-400 font-mono">-2.4m vs target</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-md bg-[#161922] border border-[#2A2E39]">
                  <div className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-wider">3PL Rider ETA</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-amber-400">4m away</span>
                    <span className="text-xs text-[#A1A1AA]">Shadowfax #9201</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-md bg-[#161922] border border-[#2A2E39]">
                  <div className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-wider">Direct UPI Settled</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-emerald-400">₹14,820</span>
                    <span className="text-[11px] font-mono text-[#A1A1AA]">T+0 direct</span>
                  </div>
                </div>
              </div>

              {/* Live Ticket Stage: Real kitchen interaction simulation */}
              <div className="p-5 rounded-md bg-[#161922] border border-[#2A2E39] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2E39] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-sm bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-mono font-bold">
                      TICKET #BJ-8841
                    </span>
                    <span className="text-xs text-white font-medium">Customer: Priya Sharma · Indiranagar</span>
                    <span className="text-xs text-[#A1A1AA] hidden sm:inline">(8th Direct Order · Platinum Diner)</span>
                  </div>
                  <div className="text-xs font-mono text-[#A1A1AA] flex items-center gap-1.5">
                    <Flame size={13} className="text-amber-400" />
                    Target Prep: 12 min · Direct Channel (0% commission)
                  </div>
                </div>

                {/* Ticket line items */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-md bg-[#0F1117] border border-[#2A2E39] flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white">2× Hyderabadi Dum Biryani</div>
                      <div className="text-[11px] text-[#A1A1AA]">Double Mirchi Ka Salan · Extra Raita</div>
                    </div>
                    <span className="text-emerald-400 font-mono text-xs">Ready in 2m</span>
                  </div>
                  <div className="p-3 rounded-md bg-[#0F1117] border border-[#2A2E39] flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white">1× Guntur Paneer Tikka</div>
                      <div className="text-[11px] text-[#A1A1AA]">Medium Spicy · Mint Chutney</div>
                    </div>
                    <span className="text-amber-400 font-mono text-xs">On Grill</span>
                  </div>
                  <div className="p-3 rounded-md bg-[#0F1117] border border-[#2A2E39] flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white">2× Mango Lassi (500ml)</div>
                      <div className="text-[11px] text-[#A1A1AA]">Chilled · Bottled</div>
                    </div>
                    <span className="text-emerald-400 font-mono text-xs">Packed ✓</span>
                  </div>
                </div>

                {/* Interactive ticket stage transition bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[#A1A1AA]">Simulate Kitchen Stage:</span>
                    <AnimatedTabs
                      tabs={[
                        { id: 'cooking', label: '1. Cooking' },
                        { id: 'packing', label: '2. Packed' },
                        { id: 'dispatched', label: '3. Dispatched' },
                      ]}
                      value={ticketState}
                      onChange={(id) => {
                        const newState = id as 'cooking' | 'packing' | 'dispatched';
                        setTicketState(newState);
                        setHandoverDone(newState === 'dispatched');
                      }}
                      className="bg-[#0F1117] border-[#2A2E39] py-0.5 px-1"
                      tabClassName="h-7 text-xs px-2.5 text-zinc-300 hover:text-white font-medium"
                      activeTabClassName={ticketState === 'dispatched' ? "bg-emerald-400 !text-black font-bold shadow-sm" : "bg-[#F59E0B] !text-black font-bold shadow-sm"}
                    />
                  </div>

                  {/* Rider Handover Action */}
                  <div className="flex items-center gap-2">
                    {handoverDone ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-semibold">
                        <Bike size={13} />
                        Dispatched with Shadowfax · OTP Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setTicketState('dispatched'); setHandoverDone(true); }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all active:scale-95 shadow-sm cursor-pointer"
                      >
                        <Bike size={14} />
                        Handover to Rider (OTP: 4912)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Dispatch & Margin Footnote inside the terminal */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#A1A1AA] pt-1">
                <div className="flex items-center gap-2 font-mono">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Order Value: ₹1,140 · Aggregator Cut: ₹0 (Saved ₹285) · Direct UPI settled instantly</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <MessageSquare size={13} className="text-[#A1A1AA]" />
                    Auto WhatsApp diner notification sent
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default MarketingHero;
