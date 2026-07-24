import { useCallback } from 'react';
import { runMarketingAssist } from '../application/runMarketingAssist';
import { getAssistantApiClient } from '../infrastructure/assistantApiClient';
import type { MarketingAssistRequest, MarketingAssistResult } from '../types';
import { useAiMarketingAssistantFeature } from './useAiMarketingAssistantFeature';

export interface UseMarketingAssistResult {
  readonly enabled: boolean;
  /**
   * Read-only marketing assist. Throws AI_FEATURE_DISABLED when flag is OFF (no network).
   * Does not execute suggestedHints. Does not touch owner/cart/checkout.
   */
  readonly ask: (request: MarketingAssistRequest) => Promise<MarketingAssistResult>;
}

export function useMarketingAssist(): UseMarketingAssistResult {
  const enabled = useAiMarketingAssistantFeature();

  const ask = useCallback(
    async (request: MarketingAssistRequest): Promise<MarketingAssistResult> => {
      return runMarketingAssist({
        enabled,
        client: getAssistantApiClient(),
        request,
      });
    },
    [enabled],
  );

  return { enabled, ask };
}
