import React, { memo } from 'react';
import { m } from 'framer-motion';
import { Check, X, Minus } from 'lucide-react';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { commissionComparison } from '../../config/landing';

type CellVal = boolean | string;

function CellValue({ value, highlight }: { value: CellVal; highlight?: boolean }) {
  if (value === true) {
    return (
      <span className={`marketing-compare-value ${highlight ? 'text-emerald-400' : 'text-emerald-400/85'}`}>
        <Check size={17} strokeWidth={2.5} aria-label="Yes" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="marketing-compare-value text-neutral-600">
        <X size={15} aria-label="No" />
      </span>
    );
  }
  if (value === 'Limited' || value === 'Basic' || value === 'Platform') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500">
        <Minus size={12} className="opacity-60" aria-hidden />
        {value}
      </span>
    );
  }
  return (
    <span
      className={`text-xs sm:text-sm font-bold tabular-nums ${
        highlight && value === '0%' ? 'text-[#FF7A00]' : highlight ? 'text-white' : 'text-neutral-400'
      }`}
    >
      {value}
    </span>
  );
}

const platformLabels = [
  { key: 'swiggy' as const, label: 'Swiggy' },
  { key: 'zomato' as const, label: 'Zomato' },
  { key: 'bhojanos' as const, label: 'BhojanOS', highlight: true },
];

export const CommissionComparison = memo(function CommissionComparison() {
  const { title, subtitle, rows } = commissionComparison;

  return (
    <Section id="compare" background="default" className="scroll-mt-24">
      <SectionHeader label="Compare" title={title} description={subtitle} />

      {/* Mobile: stacked feature cards */}
      <div className="md:hidden space-y-3">
        {rows.map((row, i) => (
          <m.article
            key={row.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-24px' }}
            transition={{ delay: i * 0.03, duration: 0.35 }}
            className="marketing-compare-card p-4"
          >
            <h3 className="text-sm font-semibold text-white mb-3">{row.label}</h3>
            <div className="grid grid-cols-3 gap-2">
              {platformLabels.map(({ key, label, highlight }) => (
                <div
                  key={key}
                  className={`rounded-xl px-2 py-2.5 text-center ${
                    highlight ? 'marketing-compare-card--highlight' : 'bg-white/[0.02] border border-white/[0.05]'
                  }`}
                >
                  <p
                    className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 truncate ${
                      highlight ? 'text-[#FF7A00]' : 'text-neutral-500'
                    }`}
                  >
                    {label}
                  </p>
                  <CellValue value={row[key]} highlight={highlight} />
                </div>
              ))}
            </div>
          </m.article>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-hidden rounded-[var(--radius-marketing-card)] border border-white/[0.08] bg-[#0A0A0A]/60 backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="p-4 lg:p-5 text-xs font-bold uppercase tracking-wider text-neutral-500 w-[30%]">
                Feature
              </th>
              {platformLabels.map(({ label, highlight }) => (
                <th
                  key={label}
                  className={`p-4 lg:p-5 text-sm font-black ${
                    highlight
                      ? 'text-[#FF7A00] bg-[#FF7A00]/[0.06] border-x border-[#FF7A00]/15'
                      : 'text-neutral-400'
                  }`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <m.tr
                key={row.label}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.03, duration: 0.35 }}
                className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="p-4 lg:p-5 text-sm font-medium text-neutral-300">{row.label}</td>
                <td className="p-4 lg:p-5 text-center">
                  <CellValue value={row.swiggy} />
                </td>
                <td className="p-4 lg:p-5 text-center">
                  <CellValue value={row.zomato} />
                </td>
                <td className="p-4 lg:p-5 text-center bg-[#FF7A00]/[0.04] border-x border-[#FF7A00]/10">
                  <CellValue value={row.bhojanos} highlight />
                </td>
              </m.tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-5 sm:mt-6 text-center text-xs text-neutral-600 max-w-2xl mx-auto leading-relaxed">
        Aggregator fees vary by city and contract. BhojanOS charges zero commission on direct orders — always.
      </p>
    </Section>
  );
});

export default CommissionComparison;
