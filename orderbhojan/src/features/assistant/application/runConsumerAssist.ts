import type { AssistantApiClient } from '../infrastructure/assistantApiClient';
import { assertNoSideEffects } from '../domain/readOnlyPolicy';
import { AssistantApiError, type ConsumerAssistRequest, type ConsumerAssistResult } from '../types';

/**
 * Flag-gated read-only assist entrypoint (shared by hook + tests).
 * When enabled=false, throws AI_FEATURE_DISABLED and performs no network I/O.
 */
export async function runConsumerAssist(params: {
  readonly enabled: boolean;
  readonly client: Pick<AssistantApiClient, 'consumerAssist'>;
  readonly getIdToken: () => Promise<string | null>;
  readonly request: Omit<ConsumerAssistRequest, 'authToken'>;
}): Promise<ConsumerAssistResult> {
  if (!params.enabled) {
    throw new AssistantApiError({
      code: 'AI_FEATURE_DISABLED',
      message: 'Consumer AI assistant is disabled.',
      retryable: false,
    });
  }

  const authToken = await params.getIdToken();
  const result = await params.client.consumerAssist({
    ...params.request,
    authToken,
  });
  assertNoSideEffects(result);
  return result;
}
