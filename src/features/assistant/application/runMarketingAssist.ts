import type { AssistantApiClient } from '../infrastructure/assistantApiClient';
import { assertNoSideEffects } from '../domain/readOnlyPolicy';
import { AssistantApiError, type MarketingAssistRequest, type MarketingAssistResult } from '../types';

/**
 * Flag-gated read-only marketing assist entrypoint (shared by hook + tests).
 * When enabled=false, throws AI_FEATURE_DISABLED and performs no network I/O.
 */
export async function runMarketingAssist(params: {
  readonly enabled: boolean;
  readonly client: Pick<AssistantApiClient, 'marketingAssist'>;
  readonly request: MarketingAssistRequest;
}): Promise<MarketingAssistResult> {
  if (!params.enabled) {
    throw new AssistantApiError({
      code: 'AI_FEATURE_DISABLED',
      message: 'Marketing AI assistant is disabled.',
      retryable: false,
    });
  }

  const result = await params.client.marketingAssist(params.request);
  assertNoSideEffects(result);
  return result;
}
