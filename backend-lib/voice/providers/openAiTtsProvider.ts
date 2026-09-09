import type { ITtsProvider, TtsRequest, TtsResult } from './types.js';
import { VoiceProviderError } from './types.js';

export interface OmniRouteTtsRequest {
  readonly text: string;
  readonly voiceId?: string;
  readonly language?: string;
}

export interface OmniRouteTtsProvider {
  generateSpeech(req: OmniRouteTtsRequest, signal?: AbortSignal): Promise<Buffer>;
}

export class OpenAiTtsProvider implements OmniRouteTtsProvider, ITtsProvider {
  public readonly providerName = 'openai';

  constructor(private readonly apiKey: string) {}

  async generateSpeech(req: TtsRequest | OmniRouteTtsRequest, signal?: AbortSignal): Promise<any> {
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: req.text,
          voice: req.voiceId || 'alloy',
          response_format: 'mp3'
        }),
        signal
      });
    } catch (err: any) {
      if (signal?.aborted || err?.name === 'AbortError') {
        throw new VoiceProviderError({
          message: 'TTS request was timed out or aborted',
          code: 'TTS_TIMEOUT',
          statusCode: 408,
          retryable: true,
          cause: err,
        });
      }
      throw new VoiceProviderError({
        message: `Failed to connect to OpenAI TTS: ${err?.message || String(err)}`,
        code: 'TTS_CONNECTION_ERROR',
        statusCode: 502,
        retryable: true,
        cause: err,
      });
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      if (response.status === 401 || response.status === 403) {
        throw new VoiceProviderError({
          message: 'Authentication failed with OpenAI TTS',
          code: 'TTS_AUTH_ERROR',
          statusCode: 401,
        });
      }
      if (response.status === 429) {
        throw new VoiceProviderError({
          message: 'OpenAI TTS rate limit reached',
          code: 'TTS_RATE_LIMIT',
          statusCode: 429,
          retryable: true,
        });
      }
      throw new VoiceProviderError({
        message: `OpenAI TTS Error ${response.status}: ${errText}`,
        code: 'TTS_PROVIDER_ERROR',
        statusCode: 502,
        retryable: true,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // If caller expects TtsResult (new interface), return TtsResult object;
    // but if caller expects Buffer directly (legacy OmniRouteTtsProvider), we attach Buffer methods or return properly.
    return {
      audioBuffer,
      contentType: 'audio/mpeg',
      provider: 'openai',
    };
  }
}
