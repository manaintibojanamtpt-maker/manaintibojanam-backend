import { LocationChip, useLocationFeatureEnabled } from '@/features/location';

export function HomeLocationBar() {
  const locationEnabled = useLocationFeatureEnabled();

  return (
    <div className="ob-home-location-bar" role="region" aria-label="Delivery area">
      <span className="ob-home-location-bar__prefix">Delivering to</span>
      {locationEnabled ? (
        <LocationChip variant="compact" className="ob-home-location-bar__chip" />
      ) : (
        <button
          type="button"
          className="ob-home-location-bar__fallback"
          disabled
          aria-disabled="true"
        >
          Home kitchens near you
        </button>
      )}
    </div>
  );
}
