import { ChevronRight } from 'lucide-react';
import { GlassCard } from '../primitives/GlassCard';
import type { OrderSummaryCardViewModel } from './types';

const statusToneClass: Record<OrderSummaryCardViewModel['statusTone'], string> = {
  active: 'bg-[#FF7A00]/15 text-[#FF7A00]',
  complete: 'bg-emerald-500/15 text-emerald-300',
  cancelled: 'bg-red-500/15 text-red-300',
};

export interface OrderSummaryCardViewProps {
  readonly order: OrderSummaryCardViewModel;
  readonly onSelect: () => void;
}

export function OrderSummaryCardView({ order, onSelect }: OrderSummaryCardViewProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={order.ariaLabel}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className="cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]/50"
    >
      <GlassCard hoverEffect className="!rounded-2xl !p-4 transition hover:border-white/20">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-white/50">Order #{order.orderNumber}</p>
            <p className="truncate font-extrabold tracking-tight text-white">{order.displayName}</p>
            <p className="text-sm text-white/60">{order.dateLabel}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusToneClass[order.statusTone]}`}
          >
            {order.statusLabel}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
          <span className="text-lg font-extrabold text-white">{order.totalLabel}</span>
          <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-[#FF7A00]">
            {order.trackLabel}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </GlassCard>
    </div>
  );
}
