import { isFeatureEnabled, loadFeatureFlags } from '@/featureFlags/flags';
import { useAuthSessionStore } from '@/features/auth/store/authSessionStore';
import { resolveAiCanaryCohortKey } from './resolveAiCanaryCohortKey';

export interface AiCanaryRequestAttachment {
  readonly headers: Readonly<Record<string, string>>;
  readonly routingKey: string;
}

/**
 * When FF_OB_AI_CANARY_HEADERS is ON, attach deterministic cohort to AI requests.
 * Flag OFF (default) → empty attachment (no headers / no routingKey).
 * Does not change UX; only identity for server canary bucketing + observability.
 */
export function buildAiCanaryRequestAttachment(params?: {
  readonly userId?: string | null;
}): AiCanaryRequestAttachment | null {
  const flags = loadFeatureFlags();
  if (!isFeatureEnabled(flags, 'FF_OB_AI_CANARY_HEADERS')) {
    return null;
  }

  const deviceId = useAuthSessionStore.getState().ensureDeviceId();
  const routingKey = resolveAiCanaryCohortKey({
    deviceId,
    userId: params?.userId,
  });

  return {
    headers: { 'x-ai-canary-key': routingKey },
    routingKey,
  };
}
