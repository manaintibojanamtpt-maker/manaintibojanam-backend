import React, { useState } from 'react';
import { IndianRupee, BadgeCheck, Ban, ArrowDown, TrendingUp, Zap, Clock } from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

/**
 * Zero Commission — Real-World 8 km Chicken Curry Receipt Comparison.
 * Left: Zomato/Swiggy aggregator trap (₹88 payout). Right: BhojanOS direct + 3PL (₹209 payout).
 * Interactive slider: 10→100 orders/day → monthly & annual savings.
 */

const KITCHEN_PRICE = 209; // ₹199 Chicken Curry + ₹10 packing
const AGGREGATOR_CUSTOMER_PRICE = 423; // inflated menu markup + platform fee + surge + GST
const AGGREGATOR_PAYOUT = 88; // after −₹121 deductions (~58% lost)
const AGGREGATOR_COMMISSION_EFFECTIVE = AGGREGATOR_CUSTOMER_PRICE - AGGREGATOR_PAYOUT; // ₹335 customer sees, kitchen gets ₹88
const DIRECT_RIDER_FARE = 70; // ~₹65–75 actual 8 km rider fare
const DIRECT_CUSTOMER_PRICE = KITCHEN_PRICE + DIRECT_RIDER_FARE; // ~₹279
const DIRECT_PAYOUT = KITCHEN_PRICE; // 0% commission
const MONTHS_PER_YEAR = 12;
const SLIDER_DEFAULT = 30;

function PayoutLine({ label, value, tone, sub }: { label: string; value: string; tone: 'danger' | 'success' | 'gold'; sub?: string }) {
  const tones = {
    danger: 'text-red-400',
    success: 'text-[#34D399]',
    gold: 'text-[#E8A95E]',
  };
  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40">{label}</div>
      <div className={`font-display font-extrabold text-2xl sm:text-3xl ${tones[tone]}`}>{value}</div>
      {sub && <p className="mt-1 text-[10px] text-white/50">{sub}</p>}
    </div>
  );
}

function PayoutItem({ label, value, tone = 'muted' }: { label: string; value: string; tone?: 'muted' | 'bad' | 'good' | 'accent' }) {
  const tones: Record<string, string> = {
    muted: 'text-white/70',
    bad: 'text-red-400',
    good: 'text-[#34D399]',
    accent: 'text-[#E8A95E]',
  };
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/55">{label}</span>
      <span className={`font-mono font-bold text-xs sm:text-sm ${tones[tone]}`}>{value}</span>
    </div>
  );
}

function AggregatorReceipt() {
  return (
    <div className="relative rounded-3xl border border-red-500/20 bg-gradient-to-br from-[#1a0a0a] via-[#0e0c0a] to-[#0a0808] p-5 sm:p-7 cine-tilt specular-rim overflow-hidden">
      {/* Header badge */}
      <div className="mb-4 flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-500/30 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-red-400">
          <Zap size={10} />
          Zomato / Swiggy Real Order Receipt · 8 km Delivery
        </span>
      </div>

      {/* Receipt items */}
      <div className="space-y-0.5">
        <PayoutItem label="Kitchen Menu Price (Chicken Curry + Packing)" value="₹209" />
        <PayoutItem label="  — Chicken Curry" value="₹199" />
        <PayoutItem label="  — Packing Charge" value="₹10" />
        <PayoutItem label="Customer Pays on App (inflated + fees + GST)" value="₹423" tone="muted" />
        <PayoutItem label="Aggregator Deductions (commission + GST + ads)" value={`− ₹${AGGREGATOR_CUSTOMER_PRICE - AGGREGATOR_PAYOUT}`} tone="bad" />
      </div>

      <PayoutLine
        label="Your Actual Bank Payout"
        value={`₹${AGGREGATOR_PAYOUT}`}
        tone="danger"
        sub="You lose 58% of your ₹209 food value. Customer pays ₹423 for a ₹209 dish."
      />
    </div>
  );
}

function BhojanOSReceipt() {
  return (
    <div className="relative rounded-3xl border border-[#D9852F]/30 bg-gradient-to-br from-[#1a1408] via-[#15120f] to-[#0e0c0a] p-5 sm:p-7 cine-tilt specular-rim overflow-hidden shadow-[0_0_60px_-16px_rgba(217,133,47,0.25)]">
      {/* Header badge */}
      <div className="mb-4 flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-[#D9852F]/15 border border-[#D9852F]/30 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#E8A95E]">
          <BadgeCheck size={10} />
          BhojanOS Direct + Rapido / Porter · 8 km Delivery
        </span>
      </div>

      {/* Receipt items */}
      <div className="space-y-0.5">
        <PayoutItem label="Kitchen Menu Price (Chicken Curry + Packing)" value="₹209" />
        <PayoutItem label="  — Chicken Curry" value="₹199" />
        <PayoutItem label="  — Packing Charge" value="₹10" />
        <PayoutItem label="8 km Direct 3PL Rider Fare (transparent)" value={`~₹${DIRECT_RIDER_FARE}`} tone="muted" />
        <PayoutItem label="Customer Pays Direct" value={`~₹${DIRECT_CUSTOMER_PRICE}`} tone="good" />
        <PayoutItem label="Customer Saves vs Aggregator" value={`−₹${AGGREGATOR_CUSTOMER_PRICE - DIRECT_CUSTOMER_PRICE}`} tone="good" />
        <PayoutItem label="BhojanOS Commission" value="₹0" tone="accent" />
      </div>

      <PayoutLine
        label="Your Actual Bank Payout"
        value={`₹${DIRECT_PAYOUT}`}
        tone="success"
        sub={`You earn +₹${DIRECT_PAYOUT - AGGREGATOR_PAYOUT} more (2.37× higher payout) while customer pays ₹${AGGREGATOR_CUSTOMER_PRICE - DIRECT_CUSTOMER_PRICE} less!`}
      />
    </div>
  );
}

function SavingsSlider({ ordersPerDay }: { ordersPerDay: number }) {
  const lostPerMonth = (AGGREGATOR_PAYOUT - DIRECT_PAYOUT) * -1 * ordersPerDay * 30; // positive number
  const lostPerYear = lostPerMonth * MONTHS_PER_YEAR;
  const lostFormatted = (n: number) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} Lakhs`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
  };
  return (
    <div className="mt-10 max-w-2xl mx-auto cine-reveal">
      <div className="text-center mb-4">
        <p className="text-sm font-bold text-white/70">
          How much does your restaurant lose to Zomato/Swiggy per month?
        </p>
        <p className="text-[11px] text-white/40 mt-0.5">Drag to match your daily order volume</p>
      </div>

      <input
        type="range"
        min={10}
        max={100}
        step={5}
        defaultValue={SLIDER_DEFAULT}
        onChange={(e) => {
          const el = e.currentTarget;
          const slider = document.getElementById('orders-slider') as HTMLInputElement | null;
          if (slider) slider.value = el.value;
        }}
        id="orders-slider"
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-[#D9852F]"
        style={{ accentColor: '#D9852F' }}
        aria-label="Daily orders per day"
      />

      <div className="flex justify-between text-[10px] text-white/40 font-mono mt-1">
        <span>10 orders/day</span>
        <span className="text-[#D9852F] font-extrabold text-base">
          {ordersPerDay} orders/day
        </span>
        <span>100 orders/day</span>
      </div>

      {/* Dynamic savings display */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[#D9852F]/20 bg-[#D9852F]/5 p-4 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#D9852F]/70 mb-1">Monthly Savings</div>
          <div className="font-display font-black text-2xl sm:text-3xl text-[#E8A95E]">
            {lostFormatted(lossPerMonth(ordersPerDay))}
          </div>
          <div className="text-[10px] text-white/40 mt-1">put back in your pocket</div>
        </div>
        <div className="rounded-2xl border border-[#34D399]/20 bg-[#34D399]/5 p-4 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#34D399]/70 mb-1">Annual Savings</div>
          <div className="font-display font-black text-2xl sm:text-3xl text-[#34D399]">
            {lostFormatted(lossPerMonth(ordersPerDay) * MONTHS_PER_YEAR)}
          </div>
          <div className="text-[10px] text-white/40 mt-1">{ordersPerDay} orders/day × 365 days</div>
        </div>
      </div>
    </div>
  );
}

function lossPerMonth(orders: number) {
  // Difference in payout per order × orders/day × 30 days
  // BhojanOS pays ₹209, Zomato/Swiggy pays ₹88 → difference = ₹121 per order
  return (DIRECT_PAYOUT - AGGREGATOR_PAYOUT) * orders * 30;
}

export function CommissionComparison() {
  const scrollRef = useScrollReveal<HTMLDivElement>();
  const [ordersPerDay, setOrdersPerDay] = useState(SLIDER_DEFAULT);

  return (
    <section
      className="relative overflow-hidden py-20 sm:py-24"
      aria-labelledby="commission-heading"
      ref={scrollRef}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#D9852F]/[0.04] to-transparent" aria-hidden />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center cine-reveal">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#D9852F]">
            Zero commission
          </p>
          <h2
            id="commission-heading"
            className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl"
          >
            Keep{' '}
            <span className="text-[#D9852F]">100%</span> of earnings.<br />
            <span className="text-white/50 text-2xl sm:text-4xl font-extrabold">
              We never take a cut. See the real numbers.
            </span>
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* AGGREGATOR — Left */}
          <div className="cine-reveal">
            <AggregatorReceipt />
          </div>

          {/* BHOJANOS — Right */}
          <div className="cine-reveal" style={{ animationDelay: '120ms' }}>
            <BhojanOSReceipt />
          </div>
        </div>

        {/* Savings Slider */}
        <SavingsSlider ordersPerDay={ordersPerDay} />

        <p className="mt-10 text-center font-display text-xl font-extrabold text-white sm:text-2xl cine-reveal">
          <span className="text-[#D9852F]">0% marketplace commission.</span> Always. Forever. On every direct order.
        </p>
      </div>
    </section>
  );
}

export default CommissionComparison;
