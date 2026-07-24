import type { AiGatewayConfig } from './aiGatewayConfig.js';

export interface OpenRouterChatMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface OpenRouterChatResult {
  readonly text: string;
  readonly model: string;
  readonly rawId?: string;
}

export class OpenRouterClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 502, code = 'AI_PROVIDER_ERROR') {
    super(message);
    this.name = 'OpenRouterClientError';
    this.status = status;
    this.code = code;
  }
}

export type FetchLike = typeof fetch;

/**
 * Server-only OpenRouter chat completions wrapper.
 * Frontends must never import or call this — only the AI gateway.
 */
export async function openRouterChatCompletion(params: {
  readonly config: AiGatewayConfig;
  readonly messages: readonly OpenRouterChatMessage[];
  readonly fetchImpl?: FetchLike;
  readonly signal?: AbortSignal;
}): Promise<OpenRouterChatResult> {
  const { config, messages } = params;
  if (!config.apiKey) {
    throw new OpenRouterClientError('OpenRouter API key is not configured', 503, 'AI_GATEWAY_NOT_CONFIGURED');
  }

  const fetchImpl = params.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const onAbort = () => controller.abort();
  params.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': config.httpReferer,
        'X-Title': config.appTitle,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: 0.4,
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          id?: string;
          model?: string;
          choices?: Array<{ message?: { content?: string | null } }>;
          error?: { message?: string };
        }
      | null;

    if (!response.ok) {
      const detail = payload?.error?.message || `OpenRouter HTTP ${response.status}`;
      throw new OpenRouterClientError(detail, response.status >= 500 ? 502 : 400);
    }

    const text = payload?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new OpenRouterClientError('OpenRouter returned an empty completion');
    }

    return {
      text,
      model: payload?.model || config.model,
      rawId: payload?.id,
    };
  } catch (err) {
    if (err instanceof OpenRouterClientError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new OpenRouterClientError('OpenRouter request timed out', 504);
    }
    const message = err instanceof Error ? err.message : 'OpenRouter request failed';
    throw new OpenRouterClientError(message);
  } finally {
    clearTimeout(timeout);
    params.signal?.removeEventListener('abort', onAbort);
  }
}
