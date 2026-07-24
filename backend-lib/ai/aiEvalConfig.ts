/**
 * Phase 23 — offline golden eval harness config.
 * Harness is always runnable via npm script; this flag is for external CI gating only.
 */
export interface AiEvalConfig {
  readonly harnessEnabled: boolean;
  readonly fixtureSetVersion: string;
}

export const AI_EVAL_FIXTURE_SET_VERSION = '1' as const;
export const AI_EVAL_SCHEMA_VERSION = '23.0' as const;

export function readAiEvalConfig(env: NodeJS.ProcessEnv = process.env): AiEvalConfig {
  return {
    harnessEnabled: env.AI_EVAL_HARNESS_ENABLED === 'true',
    fixtureSetVersion: AI_EVAL_FIXTURE_SET_VERSION,
  };
}
