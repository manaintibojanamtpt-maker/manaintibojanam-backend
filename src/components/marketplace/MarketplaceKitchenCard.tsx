import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Star, ChevronRight } from 'lucide-react';
import type { MarketplaceKitchenCard } from '../../lib/marketplace/types';

interface MarketplaceKitchenCardProps {
  readonly kitchen: MarketplaceKitchenCard;
}

const badgeStyles: Record<string, string> = {
  closest: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  fast_delivery: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  highly_rated: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  within_delivery_radius: 'bg-[#FF7A00]/15 text-[#FF7A00] border-[#FF7A00]/30',
};

export const MarketplaceKitchenCardView: React.FC<MarketplaceKitchenCardProps> = ({ kitchen }) => {
  return (
    <Link
      to={kitchen.storePath}
      className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-[#FF7A00]/40 hover:bg-white/[0.05]"
    >
      <div className="flex gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white/5">
          {kitchen.thumbnailUrl ? (
            <img
              src={kitchen.thumbnailUrl}
              alt={kitchen.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
              Kitchen
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="truncate text-base font-semibold text-white group-hover:text-[#FF7A00]">
                {kitchen.name}
              </h3>
              <p className="mt-0.5 text-xs text-white/50">{kitchen.eligibilityLabel}</p>
            </div>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-white/30 group-hover:text-[#FF7A00]" />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/60">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {kitchen.distanceKm.toFixed(1)} km
            </span>
            {kitchen.etaMins !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {kitchen.etaMins} min
              </span>
            )}
            {kitchen.rating !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {kitchen.rating.toFixed(1)}
              </span>
            )}
          </div>

          {kitchen.badges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {kitchen.badges.map((badge) => (
                <span
                  key={badge.id}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeStyles[badge.id] ?? 'border-white/10 text-white/70'}`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default MarketplaceKitchenCardView;
