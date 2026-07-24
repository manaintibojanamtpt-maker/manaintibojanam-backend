export interface AiGatewayConfig {
  readonly enabled: boolean;
  readonly apiKey: string | null;
  readonly baseUrl: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly maxTokens: number;
  readonly rateLimitMax: number;
  readonly httpReferer: string;
  readonly appTitle: string;
}

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openai/gpt-oss-20b:free';

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Server-side AI gateway config.
 * Requires explicit AI_GATEWAY_ENABLED=true — having OPENROUTER_API_KEY alone does not enable traffic.
 */
export function readAiGatewayConfig(env: NodeJS.ProcessEnv = process.env): AiGatewayConfig {
  const apiKey = env.OPENROUTER_API_KEY?.trim() || null;
  const explicitlyEnabled = env.AI_GATEWAY_ENABLED === 'true';

  return {
    enabled: explicitlyEnabled,
    apiKey,
    baseUrl: (env.OPENROUTER_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, ''),
    model: env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL,
    timeoutMs: parsePositiveInt(env.AI_GATEWAY_TIMEOUT_MS, 15_000),
    maxTokens: parsePositiveInt(env.AI_GATEWAY_MAX_TOKENS, 1024),
    rateLimitMax: parsePositiveInt(env.AI_GATEWAY_RATE_LIMIT_MAX, 60),
    httpReferer: env.AI_GATEWAY_HTTP_REFERER?.trim() || 'https://www.bhojanos.com',
    appTitle: env.AI_GATEWAY_APP_TITLE?.trim() || 'BhojanOS AI Platform',
  };
}

export function isAiGatewayReady(config: AiGatewayConfig = readAiGatewayConfig()): boolean {
  return config.enabled && Boolean(config.apiKey);
}
