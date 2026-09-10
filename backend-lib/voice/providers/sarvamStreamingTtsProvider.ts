/**
 * Purpose: Sarvam AI Streaming Text-to-Speech (TTS) implementation using Bulbul v3.
 * Public API: SarvamStreamingTtsProvider
 * Dependencies: IStreamingTtsProvider, TtsRequest, VoiceProviderError
 */

import type { IStreamingTtsProvider, TtsRequest } from './types.js';
import { VoiceProviderError } from './types.js';
import { normalizeTtsModel } from '../voiceConfig.js';

export interface SarvamStreamingTtsOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly defaultVoice?: string;
}

export class SarvamStreamingTtsProvider implements IStreamingTtsProvider {
  public readonly providerName = 'sarvam';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly defaultVoice: string;

  constructor(options: SarvamStreamingTtsOptions) {
    if (!options.apiKey || !options.apiKey.trim()) {
      throw new VoiceProviderError({
        message: 'SARVAM_API_KEY is not configured',
        code: 'TTS_AUTH_ERROR',
        statusCode: 401,
      });
    }
    this.apiKey = options.apiKey.trim().replace(/^["']|["']$/g, '');
    this.baseUrl = (options.baseUrl || 'https://api.sarvam.ai').replace(/\/$/, '');
    this.model = normalizeTtsModel(options.model);
    this.defaultVoice = (options.defaultVoice || 'aditya').replace(/^["']|["']$/g, '').trim();
  }

  public async *generateSpeechStream(request: TtsRequest, signal?: AbortSignal): AsyncIterable<Buffer> {
    const text = request.text?.trim();
    if (!text) {
      throw new VoiceProviderError({
        message: 'Text cannot be empty for TTS streaming',
        code: 'TTS_PROVIDER_ERROR',
        statusCode: 400,
      });
    }

    const speaker = request.voiceId || this.defaultVoice;
    let languageCode = request.language?.trim() || 'en-IN';
    if (languageCode === 'te') languageCode = 'te-IN';
    else if (languageCode === 'hi') languageCode = 'hi-IN';
    else if (languageCode === 'en') languageCode = 'en-IN';
    else if (languageCode === 'ta') languageCode = 'ta-IN';
    else if (languageCode === 'kn') languageCode = 'kn-IN';

    if (languageCode === 'en-IN' || !request.language) {
      if (/[\u0C00-\u0C7F]/.test(text)) {
        languageCode = 'te-IN';
      } else if (/[\u0900-\u097F]/.test(text)) {
        languageCode = 'hi-IN';
      } else if (/[\u0B80-\u0BFF]/.test(text)) {
        languageCode = 'ta-IN';
      } else if (/[\u0C80-\u0CFF]/.test(text)) {
        languageCode = 'kn-IN';
      }
    }

    const isBulbulV3OrV4 = this.model.startsWith('bulbul:v3') || this.model.startsWith('bulbul:v4');
    const payload: Record<string, any> = {
      text,
      inputs: [text],
      language_code: languageCode,
      target_language_code: languageCode,
      speaker: speaker.toLowerCase(),
      pace: request.pace ?? 1.0,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: this.model,
    };
    if (!isBulbulV3OrV4) {
      payload.pitch = 0;
      payload.loudness = 1.0;
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/text-to-speech/stream`, {
        method: 'POST',
        headers: {
          'api-subscription-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      });
    } catch (err: any) {
      if (signal?.aborted || err?.name === 'AbortError') {
        throw new VoiceProviderError({
          message: 'TTS streaming request was aborted',
          code: 'TTS_TIMEOUT',
          statusCode: 408,
          retryable: true,
          cause: err,
        });
      }
      throw new VoiceProviderError({
        message: `Failed to connect to Sarvam streaming TTS: ${err?.message || String(err)}`,
        code: 'TTS_CONNECTION_ERROR',
        statusCode: 502,
        retryable: true,
        cause: err,
      });
    }

    if (!response.ok) {
      // If /text-to-speech/stream returns 404/not implemented on test/mock environments, fallback to batch endpoint
      if (response.status === 404) {
        yield* this.fallbackToBatch(payload, signal);
        return;
      }

      const status = response.status;
      const errorText = await response.text().catch(() => '');
      if (status === 401 || status === 403) {
        throw new VoiceProviderError({
          message: 'Authentication failed with Sarvam streaming TTS',
          code: 'TTS_AUTH_ERROR',
          statusCode: 401,
        });
      }
      if (status === 429) {
        throw new VoiceProviderError({
          message: 'Sarvam TTS rate limit reached',
          code: 'TTS_RATE_LIMIT',
          statusCode: 429,
          retryable: true,
        });
      }
      throw new VoiceProviderError({
        message: `Sarvam streaming TTS provider error (${status}): ${errorText}`,
        code: 'TTS_PROVIDER_ERROR',
        statusCode: 502,
        retryable: true,
      });
    }

    if (!response.body) {
      throw new VoiceProviderError({
        message: 'No response body stream received from Sarvam TTS',
        code: 'TTS_PROVIDER_ERROR',
        statusCode: 502,
      });
    }

    const reader = response.body.getReader();
    try {
      while (true) {
        if (signal?.aborted) {
          await reader.cancel().catch(() => {});
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        if (value && value.byteLength > 0) {
          yield Buffer.from(value);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async *fallbackToBatch(payload: any, signal?: AbortSignal): AsyncIterable<Buffer> {
    const res = await fetch(`${this.baseUrl}/text-to-speech`, {
      method: 'POST',
      headers: {
        'api-subscription-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      throw new VoiceProviderError({
        message: `Sarvam batch TTS fallback failed (${res.status})`,
        code: 'TTS_PROVIDER_ERROR',
        statusCode: 502,
      });
    }

    const data: any = await res.json();
    const audioBase64 = Array.isArray(data?.audios) ? data.audios[0] : null;
    if (audioBase64 && typeof audioBase64 === 'string') {
      yield Buffer.from(audioBase64, 'base64');
    }
  }
}
