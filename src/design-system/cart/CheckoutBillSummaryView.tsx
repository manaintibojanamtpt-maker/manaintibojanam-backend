import { GlassCard } from '../primitives/GlassCard';
import type { CheckoutBillSummaryViewModel } from './types';

export interface CheckoutBillSummaryViewProps {
  readonly bill: CheckoutBillSummaryViewModel;
}

export function CheckoutBillSummaryView({ bill }: CheckoutBillSummaryViewProps) {
  return (
    <GlassCard hoverEffect={false} className="!rounded-2xl !border-white/[0.08] !bg-[#120d0c] !p-4" aria-label="Bill summary">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#c4b5a5]">Bill breakdown</p>
      {bill.lines.map((item) => (
        <div key={item.label} className="mb-2.5 flex items-baseline justify-between gap-4">
          <span className="text-sm text-[#c4b5a5]">{item.label}</span>
          <span className="text-sm font-medium tabular-nums text-[#fff8f0]/90">{item.amountLabel}</span>
        </div>
      ))}
      <div className="mt-4 flex items-baseline justify-between border-t border-[#e85d04]/20 pt-4">
        <span className="text-base font-extrabold text-[#fff8f0]">Total</span>
        <span className="text-lg font-black tabular-nums text-[#e85d04]">{bill.totalLabel}</span>
      </div>
      {bill.deliveryPendingNote ? (
        <p className="mt-3 text-sm text-[#c4b5a5]">{bill.deliveryPendingNote}</p>
      ) : null}
    </GlassCard>
  );
}
