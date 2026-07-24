import { useMemo } from 'react';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import type { PersonalizationBootstrap } from '../domain/personalizationBootstrap.types';
import { usePublishedPersonalizationBootstrap } from '../ui/personalizationBootstrapStore';
import { useAiAssistantFeature } from './useAiAssistantFeature';
import { useAiPersonalizationFeature } from './useAiPersonalizationFeature';

export function useAssistantPersonalizationContext(): {
  readonly enabled: boolean;
  readonly bootstrap: PersonalizationBootstrap | undefined;
} {
  const assistantEnabled = useAiAssistantFeature();
  const personalizationFlag = useAiPersonalizationFeature();
  const enabled = assistantEnabled && personalizationFlag;
  const published = usePublishedPersonalizationBootstrap();
  const activeRestaurantId = useRestaurantContextStore((s) => s.restaurantId);

  const bootstrap = useMemo(() => {
    if (!enabled) return undefined;
    if (!published && !activeRestaurantId) return undefined;
    return {
      ...(published ?? {}),
      ...(activeRestaurantId ? { activeRestaurantId } : {}),
    };
  }, [activeRestaurantId, enabled, published]);

  return { enabled, bootstrap };
}
