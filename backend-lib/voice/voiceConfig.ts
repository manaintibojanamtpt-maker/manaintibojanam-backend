export interface VoiceConfig {
  readonly sarvamApiKey: string | null;
  readonly sarvamBaseUrl: string;
  readonly sarvamSttModel: string;
  readonly sarvamSttLanguage: string;
  readonly sarvamTtsModel: string;
  readonly sarvamTtsVoice: string;
  readonly sarvamStreamingSttModel: string;
  readonly voiceStreamingEnabled: boolean;
  readonly voiceProviderMode: 'legacy' | 'sarvam' | 'auto';
  readonly ttsTimeoutMs: number;
  readonly sttTimeoutMs: number;
}

export function readVoiceConfig(env: NodeJS.ProcessEnv = process.env): VoiceConfig {
  return {
    sarvamApiKey: env.SARVAM_API_KEY?.trim() || null,
    sarvamBaseUrl: (env.SARVAM_API_BASE_URL?.trim() || 'https://api.sarvam.ai').replace(/\/$/, ''),
    sarvamSttModel: env.SARVAM_STT_MODEL?.trim() || 'saaras:v4',
    sarvamSttLanguage: env.SARVAM_STT_LANGUAGE?.trim() || 'unknown',
    sarvamTtsModel: env.SARVAM_TTS_MODEL?.trim() || 'bulbul:v3',
    sarvamTtsVoice: env.SARVAM_TTS_VOICE?.trim() || 'aditya',
    sarvamStreamingSttModel: env.SARVAM_STREAMING_STT_MODEL?.trim() || 'saaras:v4-realtime',
    voiceProviderMode: (env.FF_OB_VOICE_PROVIDER?.trim().toLowerCase() as 'legacy' | 'sarvam' | 'auto') || (env.SARVAM_API_KEY ? 'auto' : 'legacy'),
    voiceStreamingEnabled: env.FF_OB_VOICE_STREAMING === 'true',
    ttsTimeoutMs: Number(env.VOICE_TTS_TIMEOUT_MS) || 12000,
    sttTimeoutMs: Number(env.VOICE_STT_TIMEOUT_MS) || 15000,
  };
}
