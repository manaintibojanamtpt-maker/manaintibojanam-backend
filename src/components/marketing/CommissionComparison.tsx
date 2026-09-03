import { ArrowDown, IndianRupee, BadgeCheck, Ban } from 'lucide-react';

/**
 * Zero Commission — visual money-flow comparison.
 * LEFT: aggregator take-rate. RIGHT: BhojanOS direct (₹0 commission).
 * Coin animation = money moving customer → restaurant. Static JSX + CSS only.
 */

function MoneyRow({
  label,
  value,
  tone,
  big,
}: {
  label: string;
  value: string;
  tone: 'plain' | 'bad' | 'good' | 'accent';
  big?: boolean;
}) {
  const tones: Record<string, string> = {
    plain: 'text-white/85',
    bad: 'text-red-400',
    good: 'text-[#34D399]',
    accent: 'text-[#FF7A00]',
  };
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3">
      <span className="text-xs font-medium text-white/55">{label}</span>
      <span
        className={`font-display font-extrabold ${big ? 'text-2xl' : 'text-lg'} ${tones[tone]}`}
      >
        {value}
      </span>
    </div>
  );
}

function FlowArrow({ good }: { good?: boolean }) {
  return (
    <div className="flex justify-center py-3" aria-hidden>
      <ArrowDown
        size={18}
        className={good ? 'text-[#34D399]' : 'text-red-400/70'}
        strokeWidth={2.5}
      />
    </div>
  );
}

export function CommissionComparison() {
  return (
    <section
      className="relative overflow-hidden py-20 sm:py-24"
      aria-labelledby="commission-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#FF7A00]">
            Zero commission
          </p>
          <h2
            id="commission-heading"
            className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl"
          >
            See where your{' '}
            <span className="text-[#FF7A00]">money goes.</span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* OTHER PLATFORMS */}
          <div className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-2">
              <Ban size={16} className="text-red-400" aria-hidden />
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">
                Other platforms
              </h3>
            </div>
            <MoneyRow label="Customer pays" value="₹1,000" tone="plain" big />
            <FlowArrow />
            <MoneyRow label="Platform commission (20%)" value="− ₹200" tone="bad" />
            <FlowArrow />
            <MoneyRow label="You receive" value="₹800" tone="bad" big />
            <p className="mt-5 text-center text-xs text-white/40">
              Every order bleeds margin. Forever.
            </p>
          </div>

          {/* BHOJANOS DIRECT */}
          <div className="cine-glass cine-glass-accent relative rounded-3xl p-6 sm:p-8">
            {/* animated coins: money flowing to the restaurant */}
            <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2" aria-hidden>
              <div className="cine-coin flex h-7 w-7 items-center justify-center rounded-full bg-[#FF7A00]/90 text-black shadow-[0_0_16px_rgba(255,122,0,0.6)]">
                <IndianRupee size={13} strokeWidth={3} />
              </div>
            </div>
            <div className="mb-5 flex items-center gap-2">
              <BadgeCheck size={16} className="text-[#FF7A00]" aria-hidden />
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/85">
                BhojanOS direct
              </h3>
            </div>
            <MoneyRow label="Customer pays" value="₹1,000" tone="plain" big />
            <FlowArrow good />
            <MoneyRow label="BhojanOS commission (0%)" value="− ₹0" tone="good" />
            <FlowArrow good />
            <MoneyRow label="You receive" value="₹1,000" tone="accent" big />
            <p className="mt-5 text-center text-xs font-semibold text-[#FF7A00]/90">
              0% commission on every direct order.
            </p>
          </div>
        </div>

        <p className="mt-10 text-center font-display text-xl font-extrabold text-white sm:text-2xl">
          With BhojanOS you keep{' '}
          <span className="text-[#FF7A00]">100% of your earnings.</span>
        </p>
      </div>
    </section>
  );
}

export default CommissionComparison;

