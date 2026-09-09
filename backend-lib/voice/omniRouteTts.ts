import { OpenAiTtsProvider } from './providers/openAiTtsProvider.js';
import { SarvamTtsProvider } from './providers/sarvamTtsProvider.js';
import type { ITtsProvider, TtsResult } from './providers/types.js';
import { readVoiceConfig } from './voiceConfig.js';

let activeTtsProvider: ITtsProvider | null = null;

export function getTtsProvider(): ITtsProvider {
  if (activeTtsProvider) return activeTtsProvider;

  const config = readVoiceConfig();

  // If explicitly configured for Sarvam, or auto with key present
  if ((config.voiceProviderMode === 'sarvam' || config.voiceProviderMode === 'auto') && config.sarvamApiKey) {
    activeTtsProvider = new SarvamTtsProvider({
      apiKey: config.sarvamApiKey,
      baseUrl: config.sarvamBaseUrl,
      model: config.sarvamTtsModel,
      defaultVoice: config.sarvamTtsVoice,
    });
    return activeTtsProvider;
  }

  // Fallback to OpenAI / OpenRouter TTS
  const apiKey = process.env.OPENAI_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim();
  if (apiKey) {
    activeTtsProvider = new OpenAiTtsProvider(apiKey);
    return activeTtsProvider;
  }

  // If Sarvam key is available even in legacy mode when OpenAI key is missing
  if (config.sarvamApiKey) {
    activeTtsProvider = new SarvamTtsProvider({
      apiKey: config.sarvamApiKey,
      baseUrl: config.sarvamBaseUrl,
      model: config.sarvamTtsModel,
      defaultVoice: config.sarvamTtsVoice,
    });
    return activeTtsProvider;
  }

  throw new Error('No TTS Provider API key is configured (SARVAM_API_KEY or OPENAI_API_KEY)');
}

export function resetTtsProviderForTests(): void {
  activeTtsProvider = null;
}

export async function generateTtsAudio(
  text: string,
  options?: { voiceId?: string; lang?: string },
): Promise<{ audioBuffer: Buffer; contentType: string; provider: string }> {
  const provider = getTtsProvider();
  const config = readVoiceConfig();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.ttsTimeoutMs);
  
  try {
    const res = await provider.generateSpeech(
      {
        text,
        voiceId: options?.voiceId,
        language: options?.lang,
      },
      controller.signal,
    );

    // If provider returns legacy Buffer or TtsResult
    if (Buffer.isBuffer(res)) {
      return {
        audioBuffer: res,
        contentType: 'audio/mpeg',
        provider: provider.providerName,
      };
    }

    return {
      audioBuffer: res.audioBuffer,
      contentType: res.contentType,
      provider: res.provider,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
