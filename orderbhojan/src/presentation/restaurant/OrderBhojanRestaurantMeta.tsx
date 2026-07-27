import type { RestaurantExperienceResponse } from '@/types/marketplace-restaurant';
import {
  cuisineHeadline,
  formatDeliveryFeeLabel,
  formatDistanceLabel,
  formatEtaLabel,
  kitchenDietaryLabel,
} from '@/features/restaurant/domain/formatters';

export function OrderBhojanRestaurantMeta({ data }: { data: RestaurantExperienceResponse }) {
  const { experience } = data;
  const dietaryLabel = kitchenDietaryLabel(experience.kitchenDietary);

  const pillClass =
    'inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80';

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/60">{cuisineHeadline(experience.cuisines)}</p>
      <div className="flex flex-wrap gap-2">
        {dietaryLabel ? (
          <span
            className={`${pillClass} ${
              experience.kitchenDietary === 'pure_veg' ? 'border-green-500/30 text-green-300' : 'border-red-500/30 text-red-300'
            }`}
          >
            {dietaryLabel}
          </span>
        ) : null}
        {experience.rating != null ? (
          <span className={pillClass}>★ {experience.rating.toFixed(1)}</span>
        ) : null}
        {experience.eta ? <span className={pillClass}>{formatEtaLabel(experience.eta)}</span> : null}
        {experience.distance != null ? (
          <span className={pillClass}>{formatDistanceLabel(experience.distance)}</span>
        ) : null}
        <span className={pillClass}>
          {formatDeliveryFeeLabel(experience.deliveryFee, { known: experience.deliveryFeeKnown })}
        </span>
      </div>
    </div>
  );
}
