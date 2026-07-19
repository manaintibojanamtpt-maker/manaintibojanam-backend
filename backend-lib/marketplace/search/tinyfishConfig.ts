export interface TinyFishSearchConfig {
  readonly apiKey: string;
  readonly enabled: boolean;
  readonly location: string;
  readonly language: string;
  readonly timeoutMs: number;
  readonly cacheTtlMs: number;
}

export function readTinyFishSearchConfig(
  env: NodeJS.ProcessEnv = process.env,
): TinyFishSearchConfig | null {
  const apiKey = env.TINYFISH_API_KEY?.trim() ?? env.TINYFISH_SEARCH_API_KEY?.trim();
  if (!apiKey) return null;

  const explicitlyDisabled =
    env.TINYFISH_MENU_SEARCH_ENABLED === 'false' || env.TINYFISH_SEARCH_ENABLED === 'false';

  return {
    apiKey,
    enabled: !explicitlyDisabled,
    location: env.TINYFISH_SEARCH_LOCATION?.trim() || 'IN',
    language: env.TINYFISH_SEARCH_LANGUAGE?.trim() || 'en',
    timeoutMs: Number(env.TINYFISH_SEARCH_TIMEOUT_MS || 800),
    cacheTtlMs: Number(env.TINYFISH_SEARCH_CACHE_TTL_MS || 5 * 60_000),
  };
}

export function isTinyFishMenuSearchEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const config = readTinyFishSearchConfig(env);
  return Boolean(config?.enabled);
}
