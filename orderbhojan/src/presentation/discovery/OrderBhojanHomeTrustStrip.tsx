import { Bike, ChevronRight } from 'lucide-react';

export function OrderBhojanHomeTrustStrip() {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl bg-[#3b2a6b] px-4 py-3.5 shadow-[0_10px_28px_rgba(20,10,40,0.35)]"
      role="region"
      aria-label="Order with confidence"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
        <Bike className="h-5 w-5 text-white" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold leading-tight text-white">Fast. Safe. Reliable.</p>
        <p className="mt-0.5 text-[12px] text-white/70">Order with confidence.</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/55" aria-hidden />
    </div>
  );
}
