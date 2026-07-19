import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { MenuItemCardViewModel } from './types';

export interface MenuItemCardViewProps {
  readonly item: MenuItemCardViewModel;
  readonly actionSlot: React.ReactNode;
  readonly onPress?: () => void;
  readonly index?: number;
  readonly imagePriority?: boolean;
  readonly className?: string;
}

const badgeToneClass: Record<string, string> = {
  trending: 'bg-[#D4A574]/20 text-[#F4C27A]',
  offer: 'bg-amber-500/20 text-amber-400',
  default: 'bg-white/10 text-white/70',
};

export function MenuItemCardView({
  item,
  actionSlot,
  onPress,
  index = 0,
  imagePriority = false,
  className,
}: MenuItemCardViewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const dietaryBorder =
    item.dietary === 'veg' ? 'border-emerald-500/80' : item.dietary === 'egg' ? 'border-amber-500/80' : 'border-red-500/80';
  const dietaryDot =
    item.dietary === 'veg' ? 'bg-emerald-500' : item.dietary === 'egg' ? 'bg-amber-500' : 'bg-red-500';

  return (
    <article
      id={`menu-item-${item.id}`}
      className={cn(
        'ob-menu-card-item relative box-border grid w-full max-w-full min-w-0 grid-cols-[minmax(0,1fr)_5.5rem] items-start gap-3 border-b border-white/5 bg-[#151515] px-3 py-4 transition-colors last:border-b-0 active:bg-white/[0.02] sm:grid-cols-[minmax(0,1fr)_7.5rem] sm:gap-4 sm:px-4',
        item.unavailable && 'opacity-60',
        className,
      )}
      onClick={onPress}
      onKeyDown={
        onPress
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onPress();
              }
            }
          : undefined
      }
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
    >
      <div className="ob-menu-card-item__body flex min-w-0 flex-col justify-start pr-1 sm:pr-2">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <span
            className={cn('inline-flex h-4 w-4 items-center justify-center rounded-[4px] border bg-black/70', dietaryBorder)}
            aria-label={item.dietary === 'veg' ? 'Vegetarian' : item.dietary === 'egg' ? 'Contains egg' : 'Non-vegetarian'}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', dietaryDot)} />
          </span>
          {item.badges.map((badge) => (
            <span
              key={badge.text}
              className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider', badgeToneClass[badge.tone])}
            >
              {badge.text}
            </span>
          ))}
        </div>

        <h3 className="mb-0.5 line-clamp-2 break-words text-base font-bold leading-snug tracking-tight text-white sm:text-lg">
          {item.name}
        </h3>

        <div className="mb-2 mt-1 flex flex-wrap items-center gap-2">
          <span className="text-base font-extrabold text-white">{item.priceLabel}</span>
          {item.ratingLabel ? (
            <span className="flex items-center gap-0.5 rounded border border-white/10 bg-white/10 px-1.5 py-0.5">
              <span className="text-[10px] font-bold text-white/80">{item.ratingLabel}</span>
              <Star size={10} className="fill-green-500 text-green-500" aria-hidden />
            </span>
          ) : null}
        </div>

        {item.description ? (
          <p className="line-clamp-2 text-xs font-medium leading-relaxed tracking-wide text-white/50 sm:text-sm">
            {item.description}
          </p>
        ) : null}

        {item.metaLabels.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/45">
            {item.metaLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        ) : null}

        {item.unavailable ? <p className="mt-2 text-xs font-semibold text-red-400">Sold out</p> : null}
      </div>

      <div className="ob-menu-card-item__media relative flex min-w-0 flex-col items-stretch">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/5 bg-white/10 shadow-sm">
          {!imageLoaded ? <div className="absolute inset-0 z-0 shimmer bg-white/5" aria-hidden /> : null}
          <img
            src={item.imageUrl}
            alt={item.imageAlt}
            loading={imagePriority || index < 4 ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            className={cn(
              'h-full w-full object-cover transition-all duration-700',
              imageLoaded ? 'scale-100 opacity-100' : 'scale-110 opacity-0',
            )}
          />
        </div>
        <div className="relative z-10 -mt-3 w-full min-w-0 px-0.5">{actionSlot}</div>
      </div>
    </article>
  );
}

export default MenuItemCardView;
