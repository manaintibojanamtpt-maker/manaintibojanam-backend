import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { FeaturedMenuItemCardViewModel } from './types';

export interface FeaturedMenuItemCardViewProps {
  readonly item: FeaturedMenuItemCardViewModel;
  readonly actionSlot: React.ReactNode;
  readonly onPress?: () => void;
  readonly imagePriority?: boolean;
  readonly className?: string;
}

const badgeToneClass: Record<string, string> = {
  trending: 'bg-[#D4A574]/20 text-[#F4C27A]',
  offer: 'bg-amber-500/20 text-amber-400',
  default: 'bg-white/10 text-white/70',
};

export function FeaturedMenuItemCardView({
  item,
  actionSlot,
  onPress,
  imagePriority = false,
  className,
}: FeaturedMenuItemCardViewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <article
      className={cn('relative w-44 flex-shrink-0 sm:w-52', className)}
      onClick={onPress}
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
    >
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
        <div className="relative aspect-square w-full bg-white/5">
          {!imageLoaded ? <div className="absolute inset-0 shimmer bg-white/5" aria-hidden /> : null}
          <img
            src={item.imageUrl}
            alt={item.imageAlt}
            loading={imagePriority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            className={cn('h-full w-full object-cover transition-opacity duration-500', imageLoaded ? 'opacity-100' : 'opacity-0')}
          />
          <div className="absolute bottom-2 right-2">{actionSlot}</div>
        </div>
        <div className="space-y-1 p-3">
          <div className="flex flex-wrap gap-1">
            {item.badges.slice(0, 2).map((badge) => (
              <span
                key={badge.text}
                className={cn('rounded px-1 py-0.5 text-[8px] font-bold uppercase', badgeToneClass[badge.tone])}
              >
                {badge.text}
              </span>
            ))}
          </div>
          <h3 className="line-clamp-2 text-sm font-bold text-white">{item.name}</h3>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-extrabold text-[#f4a261]">{item.priceLabel}</span>
            {item.ratingLabel ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-white/60">
                {item.ratingLabel}
                <Star size={10} className="fill-amber-400 text-amber-400" aria-hidden />
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default FeaturedMenuItemCardView;
