import type { AssistantApiClient } from '../infrastructure/assistantApiClient';
import { assertCartPlanNonExecutable } from '../domain/cartPlanContract';
import type { CartPlanValidationRequest, CartPlanValidationResult } from '../domain/cartPlanContract';
import { AssistantApiError } from '../types';

/**
 * Flag-gated cart plan validation entrypoint (shared by hook + tests).
 * When enabled=false, throws AI_FEATURE_DISABLED and performs no network I/O.
 */
export async function runValidateCartPlan(params: {
  readonly enabled: boolean;
  readonly client: Pick<AssistantApiClient, 'validateCartPlan'>;
  readonly getIdToken: () => Promise<string | null>;
  readonly request: Omit<CartPlanValidationRequest, 'authToken'>;
}): Promise<CartPlanValidationResult> {
  if (!params.enabled) {
    throw new AssistantApiError({
      code: 'AI_FEATURE_DISABLED',
      message: 'Consumer AI assistant is disabled.',
      retryable: false,
    });
  }

  const authToken = await params.getIdToken();
  const result = await params.client.validateCartPlan({
    ...params.request,
    authToken,
  });
  assertCartPlanNonExecutable(result);
  return result;
}
