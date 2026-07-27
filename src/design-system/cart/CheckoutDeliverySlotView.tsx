import { Clock } from 'lucide-react';
import type { CheckoutDeliverySlotViewModel } from './types';

export interface CheckoutDeliverySlotViewProps {
  readonly slot: CheckoutDeliverySlotViewModel;
  readonly onSelectSlot: (slot: string) => void;
}

export function CheckoutDeliverySlotView({ slot, onSelectSlot }: CheckoutDeliverySlotViewProps) {
  const todaySlots = slot.slots.filter((entry) => slot.isAsap(entry) || entry.includes('Today'));
  const tomorrowSlots = slot.slots.filter((entry) => entry.includes('Tomorrow'));

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4" aria-labelledby="checkout-delivery-time">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#f4a261]" aria-hidden />
          <h2 id="checkout-delivery-time" className="text-sm font-semibold text-white">
            Delivery time
          </h2>
        </div>
        {slot.selectedIsAsap ? (
          <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            Fastest
          </span>
        ) : null}
      </div>

      {slot.closedMessage ? (
        <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {slot.closedMessage}
        </p>
      ) : null}

      <div className="space-y-4">
        {todaySlots.length > 0 ? (
          <div>
            <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Today</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
              {todaySlots.map((entry) => {
                const selected = slot.selectedSlot === entry;
                return (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => onSelectSlot(entry)}
                    className={`flex-shrink-0 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors touch-manipulation ${
                      selected
                        ? 'border-[#f4a261] bg-[#e85d04]/15 text-[#fff8f0]'
                        : 'border-white/10 text-white/65 hover:border-white/25'
                    }`}
                    aria-pressed={selected}
                  >
                    {slot.isAsap(entry) ? 'ASAP' : slot.formatLabel(entry)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {tomorrowSlots.length > 0 ? (
          <div>
            <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Tomorrow</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
              {tomorrowSlots.map((entry) => {
                const selected = slot.selectedSlot === entry;
                return (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => onSelectSlot(entry)}
                    className={`flex-shrink-0 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors touch-manipulation ${
                      selected
                        ? 'border-[#f4a261] bg-[#e85d04]/15 text-[#fff8f0]'
                        : 'border-white/10 text-white/65 hover:border-white/25'
                    }`}
                    aria-pressed={selected}
                  >
                    {slot.formatLabel(entry)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {!slot.selectedIsAsap && slot.selectedSummary ? (
        <p className="mt-3 text-xs text-white/60">
          Scheduled for <span className="font-medium text-white/85">{slot.selectedSummary}</span>
        </p>
      ) : null}
    </section>
  );
}
