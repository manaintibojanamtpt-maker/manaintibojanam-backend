import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Star, ChevronRight, IndianRupee } from 'lucide-react';
import type { MarketplaceKitchenCard } from '../../lib/marketplace/types';

export interface MarketplaceKitchenCardViewProps {
  readonly kitchen: MarketplaceKitchenCard;
  readonly variant?: 'default' | 'spotlight';
  readonly favoriteSlot?: React.ReactNode;
  readonly className?: string;
  readonly imageLoading?: 'lazy' | 'eager';
  readonly spotlightEyebrow?: string;
}

const badgeStyles: Record<string, string> = {
  closest: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  fast_delivery: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  highly_rated: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  within_delivery_radius: 'bg-[#FF7A00]/15 text-[#FF7A00] border-[#FF7A00]/30',
  offer: 'bg-[#FF7A00]/15 text-[#FF7A00] border-[#FF7A00]/30',
  closed: 'bg-red-500/15 text-red-300 border-red-500/30',
  kitchen_format: 'bg-white/10 text-white/80 border-white/15',
};

function KitchenThumbnail({
  kitchen,
  imageLoading,
  className,
}: {
  kitchen: MarketplaceKitchenCard;
  imageLoading: 'lazy' | 'eager';
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (kitchen.thumbnailUrl && !imageFailed) {
    return (
      <img
        src={kitchen.thumbnailUrl}
        alt={kitchen.name}
        className={className}
        loading={imageLoading}
        decoding="async"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center text-xs text-white/40 ${className ?? ''}`}>
      Kitchen
    </div>
  );
}

function KitchenMetadata({ kitchen }: { kitchen: MarketplaceKitchenCard }) {
  const distanceKm = kitchen.distanceKm;
  const showDistance = distanceKm != null && Number.isFinite(distanceKm);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/60">
      {showDistance ? (
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {distanceKm.toFixed(1)} km
        </span>
      ) : null}
      {kitchen.etaMins !== undefined && (
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {kitchen.etaMins} min
        </span>
      )}
      {kitchen.deliveryFeeLabel && kitchen.deliveryFeeLabel !== '—' ? (
        <span className="inline-flex items-center gap-1">
          <IndianRupee className="h-3.5 w-3.5" />
          {kitchen.deliveryFeeLabel}
        </span>
      ) : null}
      {kitchen.rating !== undefined && (
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {kitchen.rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

function KitchenBadges({ kitchen }: { kitchen: MarketplaceKitchenCard }) {
  if (kitchen.badges.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {kitchen.badges.map((badge) => (
        <span
          key={`${badge.id}-${badge.label}`}
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            badgeStyles[badge.id] ?? 'border-white/10 text-white/70'
          }`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

export const MarketplaceKitchenCardView: React.FC<MarketplaceKitchenCardViewProps> = ({
  kitchen,
  variant = 'default',
  favoriteSlot = null,
  className = '',
  imageLoading = 'lazy',
  spotlightEyebrow = 'Cooking now',
}) => {
  if (variant === 'spotlight') {
    return (
      <Link
        to={kitchen.storePath}
        className={`group block overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] transition hover:border-[#FF7A00]/40 hover:bg-white/[0.05] hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)] ${className}`}
      >
        <div className="relative h-48 overflow-hidden bg-white/5">
          <KitchenThumbnail
            kitchen={kitchen}
            imageLoading={imageLoading}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {favoriteSlot ? <div className="absolute right-3 top-3 z-10">{favoriteSlot}</div> : null}
          <span className="absolute left-3 top-3 rounded-full border border-[#FF7A00]/30 bg-[#FF7A00]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#FF7A00]">
            {spotlightEyebrow}
          </span>
        </div>
        <div className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FF7A00]/80">
            {kitchen.eligibilityLabel}
          </p>
          <h3 className="mt-1 line-clamp-2 text-xl font-bold text-white group-hover:text-[#FF7A00]">{kitchen.name}</h3>
          {kitchen.cuisineTags?.length ? (
            <p className="mt-1 text-sm text-white/60">{kitchen.cuisineTags.join(' · ')}</p>
          ) : null}
          <KitchenMetadata kitchen={kitchen} />
          <KitchenBadges kitchen={kitchen} />
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={kitchen.storePath}
      className={`group block h-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-[#FF7A00]/40 hover:bg-white/[0.05] hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)] ${className}`}
    >
      <div className="flex gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white/5">
          <KitchenThumbnail
            kitchen={kitchen}
            imageLoading={imageLoading}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {favoriteSlot ? <div className="absolute right-1 top-1">{favoriteSlot}</div> : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold text-white group-hover:text-[#FF7A00]">
                {kitchen.name}
              </h3>
              <p className="mt-0.5 text-xs text-white/50">
                {kitchen.cuisineTags?.join(' · ') || kitchen.eligibilityLabel}
              </p>
            </div>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-white/30 group-hover:text-[#FF7A00]" />
          </div>

          <KitchenMetadata kitchen={kitchen} />
          <KitchenBadges kitchen={kitchen} />
        </div>
      </div>
    </Link>
  );
};

export default MarketplaceKitchenCardView;
