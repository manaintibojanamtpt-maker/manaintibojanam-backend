import { ShieldCheck, Sparkles } from 'lucide-react';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { ProfileImage } from '@bhojan/storefront-design-system/primitives/ProfileImage';
import type { RestaurantExperienceResponse } from '@/types/marketplace-restaurant';
import { pictureSources } from '@/features/restaurant/data/restaurant-photo-manifest';
import {
  cuisineHeadline,
  formatOpenStatusLabel,
} from '@/features/restaurant/domain/formatters';
import { OrderBhojanRestaurantMeta } from './OrderBhojanRestaurantMeta';
import { OrderBhojanRestaurantActions } from './OrderBhojanRestaurantActions';

export interface OrderBhojanRestaurantHeroProps {
  readonly data: RestaurantExperienceResponse;
  readonly collapsed: boolean;
  readonly enterFromPoster: boolean;
  readonly coverSrc: string;
  readonly coverSrcSet?: string;
  readonly coverSizes: string;
  readonly coverBlurDataURL?: string;
  readonly coverSources?: ReturnType<typeof pictureSources>;
  readonly logoSrc: string;
}

export function OrderBhojanRestaurantHero({
  data,
  collapsed,
  enterFromPoster,
  coverSrc,
  coverSrcSet,
  coverSizes,
  coverBlurDataURL,
  coverSources,
  logoSrc,
}: OrderBhojanRestaurantHeroProps) {
  const { experience } = data;
  const primaryOffer = experience.offers[0];
  const pillClass =
    'inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm';

  return (
    <header className="relative">
      <div
        className={`relative overflow-hidden transition-all duration-500 ease-out ${
          collapsed ? 'h-28' : 'h-[46vh] min-h-[220px]'
        } ${enterFromPoster && !collapsed ? 'origin-top scale-[1.02]' : ''}`}
      >
        <picture>
          {coverSources?.map((source) => (
            <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={source.sizes} />
          ))}
          <img
            src={coverSrc}
            srcSet={coverSrcSet}
            sizes={coverSizes}
            alt={`${experience.displayName} — cover`}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover"
            style={coverBlurDataURL ? { backgroundImage: `url(${coverBlurDataURL})`, backgroundSize: 'cover' } : undefined}
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/35 to-transparent" />

        <div className="absolute left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] flex justify-end">
          <OrderBhojanRestaurantActions
            restaurantId={experience.restaurantId}
            name={experience.displayName}
            shareText={cuisineHeadline(experience.cuisines)}
          />
        </div>

        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
          {primaryOffer ? (
            <span className={`${pillClass} border-[#FF7A00]/40 text-[#FF7A00]`}>
              {primaryOffer.badge ?? primaryOffer.title}
            </span>
          ) : null}
          <span
            className={`${pillClass} ${
              experience.openStatus === 'open' ? 'border-green-500/30 text-green-300' : 'border-white/20'
            }`}
          >
            {formatOpenStatusLabel(experience.openStatus)}
          </span>
        </div>
      </div>

      <div className={`relative z-10 mx-auto max-w-3xl px-4 ${collapsed ? 'pt-4' : '-mt-16'}`}>
        <GlassCard hoverEffect={false} className="!rounded-[1.75rem] !p-4 sm:!p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <ProfileImage
              name={experience.displayName}
              imageUrl={logoSrc}
              alt={`${experience.displayName} logo`}
              className="h-14 w-14 sm:h-16 sm:w-16"
            />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-[#FF7A00]/20 bg-[#FF7A00]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-100">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  {experience.cloudKitchen ? 'Cloud kitchen' : 'Home kitchen'}
                </span>
                {!experience.cloudKitchen ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/70">
                    <ShieldCheck className="h-3 w-3 text-green-400" aria-hidden />
                    Verified
                  </span>
                ) : null}
              </div>
              <h1 className="text-xl font-black leading-tight tracking-tight text-white sm:text-2xl">
                {experience.displayName}
              </h1>
              {experience.description ? (
                <p className="mt-1 line-clamp-2 text-xs font-medium text-white/55 sm:text-sm">
                  {experience.description}
                </p>
              ) : null}
            </div>
            {experience.rating != null ? (
              <div className="flex flex-shrink-0 items-center gap-1 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-2.5 py-2 text-amber-200">
                <span className="text-sm font-black">★ {experience.rating.toFixed(1)}</span>
              </div>
            ) : null}
          </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            <OrderBhojanRestaurantMeta data={data} />
          </div>
        </GlassCard>
      </div>
    </header>
  );
}
