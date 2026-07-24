import { useCallback } from 'react';
import { useAuth } from '@/shared/providers/AuthProvider';
import { runConsumerAssist } from '../application/runConsumerAssist';
import { getAssistantApiClient } from '../infrastructure/assistantApiClient';
import type { ConsumerAssistRequest, ConsumerAssistResult } from '../types';
import { useAiAssistantFeature } from './useAiAssistantFeature';

export interface UseConsumerAssistResult {
  readonly enabled: boolean;
  /**
   * Read-only assist. Throws AI_FEATURE_DISABLED when flag is OFF (no network).
   * Does not execute suggestedHints. Does not touch cart/checkout.
   */
  readonly ask: (request: Omit<ConsumerAssistRequest, 'authToken'>) => Promise<ConsumerAssistResult>;
}

export function useConsumerAssist(): UseConsumerAssistResult {
  const enabled = useAiAssistantFeature();
  const { getIdToken } = useAuth();

  const ask = useCallback(
    async (request: Omit<ConsumerAssistRequest, 'authToken'>): Promise<ConsumerAssistResult> => {
      return runConsumerAssist({
        enabled,
        client: getAssistantApiClient(),
        getIdToken,
        request,
      });
    },
    [enabled, getIdToken],
  );

  return { enabled, ask };
}
