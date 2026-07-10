import { GlassCard } from '../primitives/GlassCard';
import type { CheckoutBillSummaryViewModel } from './types';

export interface CheckoutBillSummaryViewProps {
  readonly bill: CheckoutBillSummaryViewModel;
}

export function CheckoutBillSummaryView({ bill }: CheckoutBillSummaryViewProps) {
  return (
    <GlassCard hoverEffect={false} className="!rounded-2xl !p-4" aria-label="Bill summary">
      {bill.lines.map((item) => (
        <div key={item.label} className="mb-2 flex items-baseline justify-between">
          <span className="text-white/80">{item.label}</span>
          <span className="text-white/80">{item.amountLabel}</span>
        </div>
      ))}
      <div className="mt-3 flex items-baseline justify-between border-t border-white/10 pt-3">
        <span className="font-bold text-white">Total</span>
        <span className="font-bold text-white">{bill.totalLabel}</span>
      </div>
      {bill.deliveryPendingNote ? (
        <p className="mt-2 text-sm text-white/60">{bill.deliveryPendingNote}</p>
      ) : null}
    </GlassCard>
  );
}
