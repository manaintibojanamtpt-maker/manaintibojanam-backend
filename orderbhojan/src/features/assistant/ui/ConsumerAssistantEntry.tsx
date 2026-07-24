import { useAiAssistantFeature } from '../hooks/useAiAssistantFeature';
import { ConsumerAssistantShell } from './ConsumerAssistantShell';

/**
 * Phase 14 — flag-gated consumer assistant surface.
 * FF_OB_AI_ASSISTANT OFF (default) ⇒ null (zero DOM).
 */
export function ConsumerAssistantEntry() {
  const enabled = useAiAssistantFeature();
  if (!enabled) return null;
  return <ConsumerAssistantShell />;
}

export default ConsumerAssistantEntry;
