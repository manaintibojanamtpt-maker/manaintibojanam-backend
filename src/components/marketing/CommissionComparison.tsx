import React, { memo } from 'react';
import { m } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { commissionComparison } from '../../config/landing';

function CellValue({ value, highlight }: { value: boolean | string; highlight?: boolean }) {
  if (value === true) {
    return (
      <span className={`inline-flex items-center justify-center ${highlight ? 'text-emerald-400' : 'text-emerald-400/80'}`}>
        <Check size={18} strokeWidth={2.5} />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center text-neutral-600">
        <X size={16} />
      </span>
    );
  }
  if (value === 'Limited' || value === 'Basic' || value === 'Platform') {
    return <span className="text-xs sm:text-sm text-neutral-500 font-medium">{value}</span>;
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

export const CommissionComparison = memo(function CommissionComparison() {
  const { title, subtitle, columns, rows } = commissionComparison;

  return (
    <Section id="compare" background="default" className="scroll-mt-24">
      <SectionHeader label="Compare" title={title} description={subtitle} />

      <div className="overflow-x-auto rounded-[1.25rem] border border-white/[0.08] bg-[#0A0A0A]/60 backdrop-blur-sm">
        <table className="w-full min-w-[640px] text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="p-4 sm:p-5 text-xs font-bold uppercase tracking-wider text-neutral-500 w-[28%]">
                Feature
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className={`p-4 sm:p-5 text-sm font-black ${
                    col === 'BhojanOS'
                      ? 'text-[#FF7A00] bg-[#FF7A00]/[0.06] border-x border-[#FF7A00]/15'
                      : 'text-neutral-400'
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <m.tr
                key={row.label}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
                className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="p-4 sm:p-5 text-sm font-medium text-neutral-300">{row.label}</td>
                <td className="p-4 sm:p-5 text-center">
                  <CellValue value={row.swiggy} />
                </td>
                <td className="p-4 sm:p-5 text-center">
                  <CellValue value={row.zomato} />
                </td>
                <td className="p-4 sm:p-5 text-center bg-[#FF7A00]/[0.04] border-x border-[#FF7A00]/10">
                  <CellValue value={row.bhojanos} highlight />
                </td>
              </m.tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-center text-xs text-neutral-600 max-w-2xl mx-auto">
        Aggregator fees vary by city and contract. BhojanOS charges zero commission on direct orders — always.
      </p>
    </Section>
  );
});

export default CommissionComparison;
