import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useActiveLocation } from '@/features/location';
import { foodKeys } from './foodQueryKeys';
import { useFoodFeatureEnabled } from './useFoodFeature';

export function useFoodLocationInvalidation() {
  const queryClient = useQueryClient();
  const activeLocation = useActiveLocation();
  const enabled = useFoodFeatureEnabled();
  const lat = activeLocation?.coordinates.lat;
  const lng = activeLocation?.coordinates.lng;

  useEffect(() => {
    if (!enabled || lat == null || lng == null) return;
    void queryClient.invalidateQueries({ queryKey: foodKeys.all });
  }, [enabled, lat, lng, queryClient]);
}
