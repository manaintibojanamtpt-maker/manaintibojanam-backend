import { ArrowDown, IndianRupee, BadgeCheck, Ban } from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

/**
 * Zero Commission V2 — visual money-flow with animated rupee particles.
 * ₹0 is visually dominant. Minimal copy.
 */

function MoneyRow({ label, value, tone, big }: { label: string; value: string; tone: 'plain' | 'bad' | 'good' | 'accent'; big?: boolean }) {
  const tones: Record<string, string> = {
    plain: 'text-white/85',
    bad: 'text-red-400',
    good: 'text-[#34D399]',
    accent: 'text-[#FF7A00]',
  };
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3">
      <span className="text-xs font-medium text-white/55">{label}</span>
      <span className={`font-display font-extrabold ${big ? 'text-2xl' : 'text-lg'} ${tones[tone]}`}>{value}</span>
    </div>
  );
}

function FlowArrow({ good }: { good?: boolean }) {
  return (
    <div className="flex justify-center py-3" aria-hidden>
      <ArrowDown size={18} className={good ? 'text-[#34D399]' : 'text-red-400/70'} strokeWidth={2.5} />
    </div>
  );
}

/* Animated rupee coin flow */
function RupeeFlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="cine-coin absolute left-[30%] top-0">
        <IndianRupee size={12} className="text-[#FF7A00]" />
      </div>
      <div className="cine-coin absolute left-[50%] top-0" style={{ animationDelay: '0.7s' }}>
        <IndianRupee size={10} className="text-[#FF7A00]/70" />
      </div>
      <div className="cine-coin absolute left-[70%] top-0" style={{ animationDelay: '1.4s' }}>
        <IndianRupee size={11} className="text-[#FF7A00]/50" />
      </div>
    </div>
  );
}

export function CommissionComparison() {
  const scrollRef = useScrollReveal<HTMLDivElement>();

  return (
    <section className="relative overflow-hidden py-20 sm:py-24" aria-labelledby="commission-heading" ref={scrollRef}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center cine-reveal">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#FF7A00]">Zero commission</p>
          <h2 id="commission-heading" className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Keep <span className="text-[#FF7A00]">100%</span> of earnings.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* OTHER PLATFORMS */}
          <div className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 cine-reveal">
            <div className="mb-5 flex items-center gap-2">
              <Ban size={16} className="text-red-400" aria-hidden />
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">Other platforms</h3>
            </div>
            <MoneyRow label="Customer pays" value="₹1,000" tone="plain" big />
            <FlowArrow />
            <MoneyRow label="Commission (20%)" value="− ₹200" tone="bad" />
            <FlowArrow />
            <MoneyRow label="You receive" value="₹800" tone="bad" big />
          </div>

          {/* BHOJANOS DIRECT */}
          <div className="cine-glass cine-glass-accent relative overflow-hidden rounded-3xl p-6 sm:p-8 cine-reveal" style={{ animationDelay: '120ms' }}>
            <RupeeFlow />
            <div className="mb-5 flex items-center gap-2">
              <BadgeCheck size={16} className="text-[#FF7A00]" aria-hidden />
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/85">BhojanOS direct</h3>
            </div>
            <MoneyRow label="Customer pays" value="₹1,000" tone="plain" big />
            <FlowArrow good />
            <MoneyRow label="Commission" value="− ₹0" tone="good" />
            <FlowArrow good />
            <MoneyRow label="You receive" value="₹1,000" tone="accent" big />
          </div>
        </div>

        <p className="mt-10 text-center font-display text-xl font-extrabold text-white sm:text-2xl cine-reveal">
          0% commission. <span className="text-[#FF7A00">Always.</span>
        </p>
      </div>
    </section>
  );
}

export default CommissionComparison;
