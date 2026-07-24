import { useCallback } from 'react';
import { useAuth } from '@/shared/providers/AuthProvider';
import { runPostOrderAssist } from '../application/runPostOrderAssist';
import type { PostOrderAssistRequest, PostOrderAssistResult } from '../domain/postOrderAssistContract';
import { getAssistantApiClient } from '../infrastructure/assistantApiClient';
import { useAiAssistantFeature } from './useAiAssistantFeature';
import { useAiPostOrderFeature } from './useAiPostOrderFeature';

export interface UsePostOrderAssistResult {
  readonly enabled: boolean;
  /**
   * Read-only post-order assist. Throws AI_FEATURE_DISABLED when flags are OFF (no network).
   * Does not execute suggestedHints. Does not fetch or mutate orders.
   */
  readonly ask: (
    request: Omit<PostOrderAssistRequest, 'authToken'>,
  ) => Promise<PostOrderAssistResult>;
}

export function usePostOrderAssist(): UsePostOrderAssistResult {
  const assistantEnabled = useAiAssistantFeature();
  const postOrderEnabled = useAiPostOrderFeature();
  const enabled = assistantEnabled && postOrderEnabled;
  const { getIdToken } = useAuth();

  const ask = useCallback(
    async (request: Omit<PostOrderAssistRequest, 'authToken'>): Promise<PostOrderAssistResult> => {
      return runPostOrderAssist({
        assistantEnabled,
        postOrderEnabled,
        client: getAssistantApiClient(),
        getIdToken,
        request,
      });
    },
    [assistantEnabled, postOrderEnabled, getIdToken],
  );

  return { enabled, ask };
}
