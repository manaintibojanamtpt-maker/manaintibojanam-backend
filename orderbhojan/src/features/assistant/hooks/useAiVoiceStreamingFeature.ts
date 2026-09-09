import { useFeatureFlag } from '@/featureFlags';

/** Realtime streaming voice agent over WebSocket (/api/voice/stream) */
export function useAiVoiceStreamingFeature(): boolean {
  return useFeatureFlag('FF_OB_VOICE_STREAMING');
}
