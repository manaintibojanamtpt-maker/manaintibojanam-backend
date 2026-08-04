import { OpenAiTtsProvider } from './providers/openAiTtsProvider.js';

let primaryProvider: OpenAiTtsProvider | null = null;

export function getTtsProvider(): OpenAiTtsProvider {
  if (!primaryProvider) {
    // Try to find any API key that might work for OpenAI TTS
    const apiKey = process.env.OPENAI_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('TTS Provider API key is not configured');
    }
    primaryProvider = new OpenAiTtsProvider(apiKey);
  }
  return primaryProvider;
}

export async function generateTtsAudio(text: string, voiceId?: string): Promise<Buffer> {
  const provider = getTtsProvider();
  
  const controller = new AbortController();
  // 10-second timeout for the TTS generation
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    return await provider.generateSpeech({ text, voiceId }, controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}
