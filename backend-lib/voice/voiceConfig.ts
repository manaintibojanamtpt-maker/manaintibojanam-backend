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

function cleanEnvString(val?: string): string | undefined {
  if (!val) return undefined;
  // Strip enclosing quotes (both single and double), and any carriage returns or newlines
  const stripped = val.replace(/^["']|["']$/g, '').replace(/[\r\n]+/g, '').trim();
  return stripped || undefined;
}

const VALID_STT_MODELS = new Set([
  'saaras:v4',
  'saaras:v3',
  'saaras:v3-realtime',
  'saaras:v4-multispk',
  'saarika:v2.5',
  'saarika:v2',
  'saarika:v1',
  'saarika:flash',
]);

const VALID_TTS_MODELS = new Set([
  'bulbul:v3',
  'bulbul:v2',
  'bulbul:v3-beta',
  'bulbul:v4',
]);

export function normalizeSttModel(raw?: string): string {
  const clean = cleanEnvString(raw);
  if (clean && VALID_STT_MODELS.has(clean)) return clean;
  if (clean && clean.includes('saarika:v2.5')) return 'saarika:v2.5';
  if (clean && clean.includes('saaras:v3')) return 'saaras:v3';
  return 'saaras:v4';
}

export function normalizeTtsModel(raw?: string): string {
  const clean = cleanEnvString(raw);
  if (clean && VALID_TTS_MODELS.has(clean)) return clean;
  if (clean && clean.includes('v2')) return 'bulbul:v2';
  if (clean && clean.includes('v4')) return 'bulbul:v4';
  return 'bulbul:v3';
}

export function normalizeStreamingSttModel(raw?: string): string {
  const clean = cleanEnvString(raw);
  if (clean === 'saaras:v4-realtime' || clean === 'saaras:v3-realtime') return clean;
  return 'saaras:v4-realtime';
}

export function readVoiceConfig(env: NodeJS.ProcessEnv = process.env): VoiceConfig {
  const sarvamApiKey = cleanEnvString(env.SARVAM_API_KEY) || null;
  const rawBaseUrl = cleanEnvString(env.SARVAM_API_BASE_URL) || 'https://api.sarvam.ai';
  const sarvamBaseUrl = rawBaseUrl.replace(/\/$/, '');
  const sarvamSttModel = normalizeSttModel(env.SARVAM_STT_MODEL);
  const sarvamSttLanguage = cleanEnvString(env.SARVAM_STT_LANGUAGE) || 'unknown';
  const sarvamTtsModel = normalizeTtsModel(env.SARVAM_TTS_MODEL);
  const sarvamTtsVoice = cleanEnvString(env.SARVAM_TTS_VOICE) || 'aditya';
  const sarvamStreamingSttModel = normalizeStreamingSttModel(env.SARVAM_STREAMING_STT_MODEL);
  const providerModeRaw = cleanEnvString(env.FF_OB_VOICE_PROVIDER)?.toLowerCase();
  const voiceProviderMode =
    providerModeRaw === 'legacy' || providerModeRaw === 'sarvam' || providerModeRaw === 'auto'
      ? providerModeRaw
      : (sarvamApiKey ? 'auto' : 'legacy');
  const voiceStreamingRaw = cleanEnvString(env.FF_OB_VOICE_STREAMING);
  const voiceStreamingEnabled = voiceStreamingRaw !== undefined ? voiceStreamingRaw === 'true' : Boolean(sarvamApiKey);

  return {
    sarvamApiKey,
    sarvamBaseUrl,
    sarvamSttModel,
    sarvamSttLanguage,
    sarvamTtsModel,
    sarvamTtsVoice,
    sarvamStreamingSttModel,
    voiceProviderMode,
    voiceStreamingEnabled,
    ttsTimeoutMs: Number(cleanEnvString(env.VOICE_TTS_TIMEOUT_MS)) || 12000,
    sttTimeoutMs: Number(cleanEnvString(env.VOICE_STT_TIMEOUT_MS)) || 15000,
  };
}
