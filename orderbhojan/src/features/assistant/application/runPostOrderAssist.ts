import type { AssistantApiClient } from '../infrastructure/assistantApiClient';
import { assertPostOrderAssistSafe } from '../domain/postOrderPolicy';
import type { PostOrderAssistRequest, PostOrderAssistResult } from '../domain/postOrderAssistContract';
import { AssistantApiError } from '../types';

/**
 * Flag-gated post-order assist entrypoint.
 * Requires FF_OB_AI_ASSISTANT && FF_OB_AI_POST_ORDER; otherwise no network I/O.
 */
export async function runPostOrderAssist(params: {
  readonly assistantEnabled: boolean;
  readonly postOrderEnabled: boolean;
  readonly client: Pick<AssistantApiClient, 'postOrderAssist'>;
  readonly getIdToken: () => Promise<string | null>;
  readonly request: Omit<PostOrderAssistRequest, 'authToken'>;
}): Promise<PostOrderAssistResult> {
  if (!params.assistantEnabled || !params.postOrderEnabled) {
    throw new AssistantApiError({
      code: 'AI_FEATURE_DISABLED',
      message: 'Post-order AI assistant is disabled.',
      retryable: false,
    });
  }

  const authToken = await params.getIdToken();
  const result = await params.client.postOrderAssist({
    ...params.request,
    authToken,
  });
  assertPostOrderAssistSafe(result);
  return result;
}
