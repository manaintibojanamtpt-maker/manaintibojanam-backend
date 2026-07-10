import {
  AlertCircle,
  Bike,
  CheckCircle2,
  ChefHat,
  CircleDot,
  Package,
  XCircle,
} from 'lucide-react';
import { GlassCard } from '../../primitives/GlassCard';
import type { TrackingTimelineIcon, TrackingTimelineStepViewModel } from './types';

const iconMap: Record<TrackingTimelineIcon, typeof CircleDot> = {
  placed: Package,
  accepted: CheckCircle2,
  preparing: ChefHat,
  delivery: Bike,
  delivered: CheckCircle2,
  cancelled: XCircle,
};

export interface CourierTrackingTimelineViewProps {
  readonly steps: readonly TrackingTimelineStepViewModel[];
  readonly cancelled?: boolean;
  readonly cancelledLabel?: string;
}

export function CourierTrackingTimelineView({
  steps,
  cancelled = false,
  cancelledLabel = 'Order cancelled',
}: CourierTrackingTimelineViewProps) {
  if (cancelled) {
    return (
      <ol className="relative space-y-0" aria-label="Order status timeline">
        <li className="grid grid-cols-[2.5rem_1fr] gap-3 pb-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-400/50 bg-red-500/10 text-red-300">
            <XCircle className="h-5 w-5" aria-hidden />
          </div>
          <GlassCard hoverEffect={false} className="!rounded-2xl !p-4">
            <p className="font-bold text-white">{cancelledLabel}</p>
          </GlassCard>
        </li>
      </ol>
    );
  }

  return (
    <ol className="relative space-y-0" aria-label="Order status timeline">
      {steps.map((step, index) => {
        const Icon = iconMap[step.icon] ?? AlertCircle;
        const isLast = index === steps.length - 1;
        const active = step.state === 'active';
        const done = step.state === 'done';

        return (
          <li key={step.id} className="relative grid grid-cols-[2.5rem_1fr] gap-3 pb-6 last:pb-0">
            {!isLast ? (
              <span
                className={`absolute left-5 top-10 bottom-0 w-0.5 ${
                  done || active ? 'bg-gradient-to-b from-[#FF7A00] to-white/10' : 'bg-white/10'
                }`}
                aria-hidden
              />
            ) : null}
            <div
              className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                active
                  ? 'border-[#FF7A00] bg-[#FF7A00]/15 text-[#FF7A00] shadow-[0_0_0_4px_rgba(255,122,0,0.12)]'
                  : done
                    ? 'border-[#FF7A00]/40 bg-[#FF7A00]/10 text-[#FF7A00]'
                    : 'border-white/10 bg-white/[0.03] text-white/40'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div
              className={`rounded-2xl border p-4 ${
                active
                  ? 'border-white/10 bg-white/[0.04] shadow-lg backdrop-blur-md'
                  : 'border-transparent bg-transparent'
              }`}
            >
              <p className="font-bold text-white">{step.label}</p>
              {step.timestampLabel ? (
                <p className="mt-0.5 text-sm text-white/50">{step.timestampLabel}</p>
              ) : null}
              {step.message && (active || done) ? (
                <p className="mt-1 text-sm text-white/70">{step.message}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
