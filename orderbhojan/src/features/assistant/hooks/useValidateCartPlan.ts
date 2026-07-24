import { useCallback } from 'react';
import { useAuth } from '@/shared/providers/AuthProvider';
import { runValidateCartPlan } from '../application/runValidateCartPlan';
import type { CartPlanValidationRequest, CartPlanValidationResult } from '../domain/cartPlanContract';
import { getAssistantApiClient } from '../infrastructure/assistantApiClient';
import { useAiAssistantFeature } from './useAiAssistantFeature';

export interface UseValidateCartPlanResult {
  readonly enabled: boolean;
  /**
   * Validates proposed cart plans. Throws AI_FEATURE_DISABLED when flag is OFF (no network).
   * Does not apply plans to cart/checkout.
   */
  readonly validate: (
    request: Omit<CartPlanValidationRequest, 'authToken'>,
  ) => Promise<CartPlanValidationResult>;
}

export function useValidateCartPlan(): UseValidateCartPlanResult {
  const enabled = useAiAssistantFeature();
  const { getIdToken } = useAuth();

  const validate = useCallback(
    async (
      request: Omit<CartPlanValidationRequest, 'authToken'>,
    ): Promise<CartPlanValidationResult> => {
      return runValidateCartPlan({
        enabled,
        client: getAssistantApiClient(),
        getIdToken,
        request,
      });
    },
    [enabled, getIdToken],
  );

  return { enabled, validate };
}
