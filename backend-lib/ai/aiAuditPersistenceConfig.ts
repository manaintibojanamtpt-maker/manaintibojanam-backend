/**
 * Phase 21 — durable AI audit persistence (Firestore).
 * OFF by default; does not affect assist UX or in-process metrics.
 */
export interface AiAuditPersistenceConfig {
  readonly enabled: boolean;
}

export function readAiAuditPersistenceConfig(
  env: NodeJS.ProcessEnv = process.env,
): AiAuditPersistenceConfig {
  return {
    enabled: env.AI_AUDIT_PERSISTENCE_ENABLED === 'true',
  };
}
