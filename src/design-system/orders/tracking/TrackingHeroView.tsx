import { GlassCard } from '../../primitives/GlassCard';
import type { TrackingHeroViewModel } from './types';

export interface TrackingHeroViewProps {
  readonly hero: TrackingHeroViewModel;
}

export function TrackingHeroView({ hero }: TrackingHeroViewProps) {
  return (
    <GlassCard hoverEffect={false} className="!rounded-[2rem] !p-6 text-center" aria-label="Order status">
      <p className="text-2xl font-extrabold tracking-tight text-white">{hero.statusLabel}</p>
      {hero.kitchenName ? <p className="mt-1 text-lg font-bold text-white/80">{hero.kitchenName}</p> : null}
      <p className="mt-1 text-sm text-white/60">{hero.orderNumberLabel}</p>
      {hero.etaLabel ? (
        <p className="mt-3 inline-flex rounded-full bg-[#FF7A00]/15 px-4 py-2 text-sm font-bold text-[#FF7A00]">
          ETA {hero.etaLabel}
        </p>
      ) : null}
      {hero.showLive && hero.liveLabel ? (
        <div
          className={`mt-3 inline-flex items-center gap-2 text-xs font-semibold text-white/60 ${
            hero.liveActive ? 'motion-safe:animate-pulse' : ''
          }`}
          aria-live="polite"
        >
          <span
            className={`h-2 w-2 rounded-full bg-[#FF7A00] ${hero.liveActive ? 'motion-safe:animate-pulse' : ''}`}
            aria-hidden
          />
          {hero.liveLabel}
        </div>
      ) : null}
    </GlassCard>
  );
}
