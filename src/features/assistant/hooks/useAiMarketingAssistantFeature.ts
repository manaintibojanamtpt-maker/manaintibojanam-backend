import { FeatureFlags } from '../../../config/features';

/** Marketing AI assistant flag — OFF by default (`VITE_FF_AI_MARKETING_ASSISTANT`). */
export function useAiMarketingAssistantFeature(): boolean {
  return FeatureFlags.isEnabled('aiMarketingAssistant');
}
