import { Clock } from 'lucide-react';
import type { CheckoutDeliverySlotViewModel } from './types';

export interface CheckoutDeliverySlotViewProps {
  readonly slot: CheckoutDeliverySlotViewModel;
  readonly onSelectSlot: (slot: string) => void;
}

/**
 * Deliver now / Schedule picker — metadata only (no payment).
 * Aligns with backend DeliveryTime: asap vs scheduled slots from kitchen.
 */
export function CheckoutDeliverySlotView({ slot, onSelectSlot }: CheckoutDeliverySlotViewProps) {
  const asapSlot = slot.slots.find((entry) => slot.isAsap(entry));
  const scheduledSlots = slot.slots.filter((entry) => !slot.isAsap(entry));
  const todaySlots = scheduledSlots.filter((entry) => entry.includes('Today'));
  const tomorrowSlots = scheduledSlots.filter((entry) => entry.includes('Tomorrow'));
  const otherScheduled = scheduledSlots.filter(
    (entry) => !entry.includes('Today') && !entry.includes('Tomorrow'),
  );

  const mode: 'now' | 'schedule' = slot.selectedIsAsap ? 'now' : 'schedule';

  const selectDeliverNow = () => {
    if (asapSlot) onSelectSlot(asapSlot);
  };

  const selectScheduleMode = () => {
    if (slot.selectedIsAsap) {
      const first = todaySlots[0] ?? tomorrowSlots[0] ?? otherScheduled[0];
      if (first) onSelectSlot(first);
    }
  };

  return (
    <section
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
      aria-labelledby="checkout-delivery-time"
    >
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

      {slot.voiceScheduleNotice && slot.voiceScheduleNoticeKind !== 'applied' ? (
        <p
          className={`mb-3 rounded-xl border px-3 py-2 text-xs ${
            slot.voiceScheduleNoticeKind === 'error'
              ? 'border-rose-500/35 bg-rose-500/10 text-rose-100'
              : 'border-sky-500/35 bg-sky-500/10 text-sky-100'
          }`}
          role="status"
        >
          {slot.voiceScheduleNotice}
        </p>
      ) : null}

      {slot.voiceScheduleNotice && slot.voiceScheduleNoticeKind === 'applied' ? (
        <p className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100" role="status">
          {slot.voiceScheduleNotice}
        </p>
      ) : null}

      <div
        className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/20 p-1"
        role="tablist"
        aria-label="Delivery mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'now'}
          disabled={!asapSlot}
          onClick={selectDeliverNow}
          className={`rounded-lg px-3 py-2.5 text-xs font-bold touch-manipulation transition-colors ${
            mode === 'now'
              ? 'bg-[#e85d04]/25 text-[#fff8f0] border border-[#f4a261]/60'
              : 'text-white/60 hover:text-white/85 border border-transparent'
          } ${!asapSlot ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          Deliver now
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'schedule'}
          disabled={scheduledSlots.length === 0}
          onClick={selectScheduleMode}
          className={`rounded-lg px-3 py-2.5 text-xs font-bold touch-manipulation transition-colors ${
            mode === 'schedule'
              ? 'bg-[#e85d04]/25 text-[#fff8f0] border border-[#f4a261]/60'
              : 'text-white/60 hover:text-white/85 border border-transparent'
          } ${scheduledSlots.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          Schedule
        </button>
      </div>

      {mode === 'now' ? (
        <p className="text-xs text-white/65">
          We will send this as soon as the kitchen is ready — no future slot selected.
        </p>
      ) : (
        <div className="space-y-4">
          {todaySlots.length > 0 ? (
            <div>
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                Today
              </p>
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
                      {slot.formatLabel(entry)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {tomorrowSlots.length > 0 ? (
            <div>
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                Tomorrow
              </p>
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

          {otherScheduled.length > 0 ? (
            <div>
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                Later
              </p>
              <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
                {otherScheduled.map((entry) => {
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

          {scheduledSlots.length === 0 ? (
            <p className="text-xs text-white/55">No schedule slots from this kitchen right now.</p>
          ) : null}
        </div>
      )}

      {!slot.selectedIsAsap && slot.selectedSummary ? (
        <p className="mt-3 text-xs text-white/60">
          Scheduled for <span className="font-medium text-white/85">{slot.selectedSummary}</span>
        </p>
      ) : null}
    </section>
  );
}
