import React, { useState } from 'react';
import { 
  Percent, 
  Database, 
  Wallet, 
  Store, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  BadgeCheck, 
  CheckCircle2, 
  X 
} from 'lucide-react';

const KITCHEN_PRICE = 209; // ₹199 Chicken Curry + ₹10 packing
const AGGREGATOR_CUSTOMER_PRICE = 423; // inflated menu markup + platform fee + surge + GST
const AGGREGATOR_PAYOUT = 88; // after −₹121 deductions (~58% lost)
const DIRECT_RIDER_FARE = 70; // ~₹65–75 actual 8 km rider fare
const DIRECT_CUSTOMER_PRICE = KITCHEN_PRICE + DIRECT_RIDER_FARE; // ~₹279
const DIRECT_PAYOUT = KITCHEN_PRICE; // 0% commission
const BHOJAN_MONTHLY_FEE = 999; // Growth plan from src/config/pricing.ts

export function CommissionComparison() {
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(800000);

  // Financial calculations
  const aggregatorRate = 0.28;
  const aggregatorCutMonthly = Math.round(monthlyRevenue * aggregatorRate);
  const aggregatorCutAnnualLakhs = ((aggregatorCutMonthly * 12) / 100000).toFixed(2);

  const netMonthlySaved = Math.max(0, aggregatorCutMonthly - BHOJAN_MONTHLY_FEE);
  const annualSavedLakhs = ((netMonthlySaved * 12) / 100000).toFixed(2);

  const formatINR = (val: number) => '₹' + Number(val).toLocaleString('en-IN');

  return (
    <section 
      id="comparison" 
      className="py-20 sm:py-24 border-b border-[#27272A] bg-[#09090B] text-[#FAFAFA]"
      aria-labelledby="comparison-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* SECTION HEADER */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.15] shadow-none mb-4">
            <span className="text-xs font-mono font-semibold text-[#D97706] uppercase tracking-wider">
              The Economics of Sovereignty
            </span>
          </div>
          <h2 
            id="comparison-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#FAFAFA] leading-tight"
          >
            Market Math: What Aggregators Drain vs What BhojanOS Keeps in Your Till.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#A1A1AA] leading-relaxed">
            A restaurant doing ₹8 Lakhs in monthly online volume gives away over ₹26.8 Lakhs a year in aggregator commission, listing fees, and customer disintermediation. Here is the architectural contrast.
          </p>
        </div>

        {/* SIDE-BY-SIDE COMPARISON TABLE MATRIX */}
        <div className="rounded-md border border-[#27272A] bg-[#18181B] overflow-hidden mb-16 shadow-none">
          {/* Header Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 border-b border-[#27272A] bg-[#111114] text-xs font-semibold">
            <div className="p-4 sm:p-5 text-[#A1A1AA] uppercase tracking-wider">
              Operational Pillar
            </div>
            <div className="p-4 sm:p-5 text-[#DC2626] uppercase tracking-wider border-t md:border-t-0 md:border-l border-[#27272A] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
              Marketplace Aggregators (Swiggy / Zomato)
            </div>
            <div className="p-4 sm:p-5 text-[#10B981] uppercase tracking-wider border-t md:border-t-0 md:border-l border-[#27272A] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              BhojanOS Direct Sovereign Stack
            </div>
          </div>

          {/* Row 1: Commission */}
          <div className="grid grid-cols-1 md:grid-cols-3 border-b border-[#27272A] text-sm">
            <div className="p-4 sm:p-5 font-semibold text-[#FAFAFA] bg-[#18181B] flex items-center gap-2.5">
              <Percent size={16} className="text-[#D97706] shrink-0" />
              <span>Platform Commission</span>
            </div>
            <div className="p-4 sm:p-5 bg-red-950/20 border-t md:border-t-0 md:border-l border-[#27272A]">
              <div className="font-bold text-[#DC2626]">25% to 32% per order + 18% GST</div>
              <div className="text-xs text-[#A1A1AA] mt-1">Plus mandatory ad clicks, discount co-funding, and cancellation cuts.</div>
            </div>
            <div className="p-4 sm:p-5 bg-emerald-950/20 border-t md:border-t-0 md:border-l border-[#27272A]">
              <div className="font-bold text-[#10B981]">0% Commission Forever</div>
              <div className="text-xs text-[#A1A1AA] mt-1">Predictable flat monthly software. Every order rupee stays with your kitchen.</div>
            </div>
          </div>

          {/* Row 2: Customer Data */}
          <div className="grid grid-cols-1 md:grid-cols-3 border-b border-[#27272A] text-sm">
            <div className="p-4 sm:p-5 font-semibold text-[#FAFAFA] bg-[#18181B] flex items-center gap-2.5">
              <Database size={16} className="text-[#3B82F6] shrink-0" />
              <span>Diner Database &amp; CRM</span>
            </div>
            <div className="p-4 sm:p-5 bg-red-950/20 border-t md:border-t-0 md:border-l border-[#27272A]">
              <div className="font-bold text-[#FAFAFA]">Masked Virtual Phone Numbers</div>
              <div className="text-xs text-[#A1A1AA] mt-1">Zero re-targeting rights. Customer belongs strictly to the marketplace.</div>
            </div>
            <div className="p-4 sm:p-5 bg-emerald-950/20 border-t md:border-t-0 md:border-l border-[#27272A]">
              <div className="font-bold text-[#10B981]">100% Direct Diner Database</div>
              <div className="text-xs text-[#A1A1AA] mt-1">Unmasked mobile numbers, WhatsApp history, visit frequency, and favorite dishes.</div>
            </div>
          </div>

          {/* Row 3: Cash Flow */}
          <div className="grid grid-cols-1 md:grid-cols-3 border-b border-[#27272A] text-sm">
            <div className="p-4 sm:p-5 font-semibold text-[#FAFAFA] bg-[#18181B] flex items-center gap-2.5">
              <Wallet size={16} className="text-[#10B981] shrink-0" />
              <span>Settlement &amp; Cash Flow</span>
            </div>
            <div className="p-4 sm:p-5 bg-red-950/20 border-t md:border-t-0 md:border-l border-[#27272A]">
              <div className="font-bold text-[#FAFAFA]">Weekly Batch Settlements (Delayed)</div>
              <div className="text-xs text-[#A1A1AA] mt-1">Opaque reconciliation deductions, customer refunds, and payment holds.</div>
            </div>
            <div className="p-4 sm:p-5 bg-emerald-950/20 border-t md:border-t-0 md:border-l border-[#27272A]">
              <div className="font-bold text-[#10B981]">T+0 Instant Daily UPI Settlement</div>
              <div className="text-xs text-[#A1A1AA] mt-1">Direct bank payout to HDFC, ICICI, or SBI via Razorpay Route rails daily.</div>
            </div>
          </div>

          {/* Row 4: Brand Loyalty */}
          <div className="grid grid-cols-1 md:grid-cols-3 text-sm">
            <div className="p-4 sm:p-5 font-semibold text-[#FAFAFA] bg-[#18181B] flex items-center gap-2.5">
              <Store size={16} className="text-[#A855F7] shrink-0" />
              <span>Brand Experience &amp; Storefront</span>
            </div>
            <div className="p-4 sm:p-5 bg-red-950/20 border-t md:border-t-0 md:border-l border-[#27272A]">
              <div className="font-bold text-[#FAFAFA]">Diner Sees 40 Competitors Above You</div>
              <div className="text-xs text-[#A1A1AA] mt-1">Platform algorithm pushes deep-pocketed cloud kitchens and aggressive ad bidders.</div>
            </div>
            <div className="p-4 sm:p-5 bg-emerald-950/20 border-t md:border-t-0 md:border-l border-[#27272A]">
              <div className="font-bold text-[#10B981]">Your Custom Domain &amp; Brand</div>
              <div className="text-xs text-[#A1A1AA] mt-1">Distraction-free ordering, custom typography, direct brand love, and 1-tap reorders.</div>
            </div>
          </div>
        </div>

        {/* INTERACTIVE VISUAL REVENUE SAVINGS CALCULATOR */}
        <div id="calculator" className="rounded-md border border-[#27272A] bg-[#18181B] p-6 sm:p-10 mb-16 shadow-none scroll-mt-24">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <span className="text-xs font-mono font-semibold text-[#D97706] uppercase tracking-wider">
                Real-Time Margin Ledger
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#FAFAFA] mt-1">
                Interactive Annual Savings Calculator
              </h3>
              <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1">
                Simulate what shifting online order volume to BhojanOS recovers for your bottom line.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#71717A] font-medium mr-1">Quick Select:</span>
              {[
                { label: '₹3L/mo', val: 300000 },
                { label: '₹8L/mo', val: 800000 },
                { label: '₹15L/mo', val: 1500000 },
                { label: '₹30L/mo', val: 3000000 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setMonthlyRevenue(preset.val)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-mono font-semibold transition-all ${
                    monthlyRevenue === preset.val
                      ? 'bg-[#D97706] text-white shadow-none'
                      : 'bg-[#111114] text-[#A1A1AA] hover:bg-[#27272A] hover:text-white border border-[#27272A]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slider Control Bar */}
          <div className="mb-8 p-5 sm:p-6 rounded-sm bg-[#111114] border border-[#27272A]">
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="revRange" className="text-xs sm:text-sm font-semibold text-[#FAFAFA]">
                Estimated Monthly Online Order Sales
              </label>
              <span className="font-mono text-lg sm:text-xl font-bold text-[#D97706]">
                {formatINR(monthlyRevenue)} / month
              </span>
            </div>

            <input
              id="revRange"
              type="range"
              min="100000"
              max="5000000"
              step="50000"
              value={monthlyRevenue}
              onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
              className="w-full h-2.5 bg-[#27272A] rounded-sm appearance-none cursor-pointer accent-[#D97706]"
              aria-label="Monthly online order sales volume"
            />

            <div className="flex justify-between text-[11px] text-[#71717A] font-mono mt-2">
              <span>₹1,00,000 / mo</span>
              <span>₹25,00,000 / mo</span>
              <span>₹50,00,000+ / mo</span>
            </div>
          </div>

          {/* Calculation Readout Ledger */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Aggregator Loss */}
            <div className="p-5 rounded-sm bg-[#111114] border border-[#27272A] shadow-none">
              <div className="text-[11px] font-mono uppercase font-semibold text-[#DC2626]">
                Aggregator Cut (28% Avg)
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[#FAFAFA] mt-2 mb-1">
                {formatINR(aggregatorCutMonthly)}
              </div>
              <div className="text-xs text-[#A1A1AA]">
                Drained per month <span className="font-mono text-[#DC2626] font-semibold">(₹{aggregatorCutAnnualLakhs}L / yr)</span>
              </div>
            </div>

            {/* BhojanOS Flat Software */}
            <div className="p-5 rounded-sm bg-[#111114] border border-[#27272A] shadow-none">
              <div className="text-[11px] font-mono uppercase font-semibold text-[#A1A1AA]">
                BhojanOS Growth Plan
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[#FAFAFA] mt-2 mb-1">
                {formatINR(BHOJAN_MONTHLY_FEE)}
              </div>
              <div className="text-xs text-[#A1A1AA]">
                Flat software fee · Zero order commission
              </div>
            </div>

            {/* Net Recovered Margin */}
            <div className="mkt-reveal-scale p-5 rounded-sm bg-emerald-950/40 border-2 border-[#10B981] shadow-none">
              <div className="text-[11px] font-mono uppercase font-bold text-[#10B981]">
                Net Profit Recovered For Your Kitchen
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[#10B981] mt-2 mb-1">
                {formatINR(netMonthlySaved)} / mo
              </div>
              <div className="text-xs text-[#10B981] font-medium">
                Annual profit kept: <strong className="font-mono font-bold text-sm">₹{annualSavedLakhs} Lakhs</strong>
              </div>
            </div>
          </div>
        </div>

        {/* REAL-WORLD 8 KM ORDER RECEIPT COMPARISON */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Aggregator Receipt */}
          <div className="rounded-md border border-red-950/80 bg-[#18181B] p-6 shadow-none">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center gap-1.5 rounded-full bg-red-950/50 border border-red-900/60 px-3 py-1 text-[10px] font-bold text-[#DC2626] uppercase font-mono">
                <Zap size={11} />
                Zomato / Swiggy Real Order · 8 km Delivery
              </span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-[#27272A]">
              <div className="flex justify-between py-1.5">
                <span className="text-[#A1A1AA]">Kitchen Menu Price (Chicken Curry + Packing)</span>
                <span className="font-mono font-semibold text-[#FAFAFA]">₹209</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#71717A]">Customer Pays on App (menu markup + platform fees + GST)</span>
                <span className="font-mono text-[#71717A]">₹423</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#DC2626] font-medium">Aggregator Deductions (commission + GST + rider cuts)</span>
                <span className="font-mono text-[#DC2626] font-bold">− ₹121</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#27272A]">
              <div className="text-[10px] font-mono uppercase font-bold text-[#71717A]">Actual Bank Payout to Kitchen</div>
              <div className="font-mono text-3xl font-black text-[#DC2626] mt-1">₹88</div>
              <p className="mt-1 text-xs text-[#71717A]">
                You lose 58% of your ₹209 food value. Customer pays ₹423 for a ₹209 dish.
              </p>
            </div>
          </div>

          {/* BhojanOS Receipt */}
          <div className="rounded-md border border-emerald-950/80 bg-[#18181B] p-6 shadow-none">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-950/50 border border-emerald-900/60 px-3 py-1 text-[10px] font-bold text-[#10B981] uppercase font-mono">
                <BadgeCheck size={11} />
                BhojanOS Direct + Shadowfax / Porter · 8 km Delivery
              </span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-[#27272A]">
              <div className="flex justify-between py-1.5">
                <span className="text-[#A1A1AA]">Kitchen Menu Price (Chicken Curry + Packing)</span>
                <span className="font-mono font-semibold text-[#FAFAFA]">₹209</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#71717A]">8 km Direct 3PL Rider Fare (transparent pass-through)</span>
                <span className="font-mono text-[#71717A]">~₹70</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#10B981] font-medium">BhojanOS Per-Order Commission</span>
                <span className="font-mono text-[#10B981] font-bold">₹0</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#27272A]">
              <div className="text-[10px] font-mono uppercase font-bold text-[#71717A]">Actual Bank Payout to Kitchen</div>
              <div className="font-mono text-3xl font-black text-[#10B981] mt-1">₹209</div>
              <p className="mt-1 text-xs text-[#10B981] font-medium">
                You retain full ₹209 (+₹121 more per order) while customer pays ₹279 (saves ₹144!).
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default CommissionComparison;
