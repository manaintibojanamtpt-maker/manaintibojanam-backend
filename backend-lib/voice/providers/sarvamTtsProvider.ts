/**
 * Purpose: Sarvam AI Text-to-Speech (TTS) implementation using Bulbul v3.
 * Public API: SarvamTtsProvider
 * Dependencies: ITtsProvider, TtsRequest, TtsResult, VoiceProviderError
 */

import type { ITtsProvider, TtsRequest, TtsResult } from './types.js';
import { VoiceProviderError } from './types.js';

export interface SarvamTtsOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly defaultVoice?: string;
}

export class SarvamTtsProvider implements ITtsProvider {
  public readonly providerName = 'sarvam';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly defaultVoice: string;

  constructor(options: SarvamTtsOptions) {
    if (!options.apiKey || !options.apiKey.trim()) {
      throw new VoiceProviderError({
        message: 'SARVAM_API_KEY is not configured',
        code: 'TTS_AUTH_ERROR',
        statusCode: 401,
      });
    }
    this.apiKey = options.apiKey.trim();
    this.baseUrl = (options.baseUrl || 'https://api.sarvam.ai').replace(/\/$/, '');
    this.model = options.model || 'bulbul:v3';
    this.defaultVoice = options.defaultVoice || 'aditya';
  }

  public async generateSpeech(request: TtsRequest, signal?: AbortSignal): Promise<TtsResult> {
    const text = request.text?.trim();
    if (!text) {
      throw new VoiceProviderError({
        message: 'Text cannot be empty for TTS synthesis',
        code: 'TTS_PROVIDER_ERROR',
        statusCode: 400,
      });
    }

    const speaker = request.voiceId || this.defaultVoice;
    // Normalize language and auto-detect Indic scripts for natural prosody & phonetics
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

    const payload = {
      inputs: [text],
      target_language_code: languageCode,
      speaker: speaker.toLowerCase(),
      pitch: 0,
      pace: request.pace ?? 1.0,
      loudness: 1.0,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: this.model,
    };

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/text-to-speech`, {
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
          message: 'TTS request was timed out or aborted',
          code: 'TTS_TIMEOUT',
          statusCode: 408,
          retryable: true,
          cause: err,
        });
      }
      throw new VoiceProviderError({
        message: `Failed to connect to Sarvam TTS: ${err?.message || String(err)}`,
        code: 'TTS_CONNECTION_ERROR',
        statusCode: 502,
        retryable: true,
        cause: err,
      });
    }

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text().catch(() => '');
      if (status === 401 || status === 403) {
        throw new VoiceProviderError({
          message: 'Authentication failed with Sarvam TTS',
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
        message: `Sarvam TTS provider error (${status}): ${errorText}`,
        code: 'TTS_PROVIDER_ERROR',
        statusCode: 502,
        retryable: true,
      });
    }

    let data: any;
    try {
      data = await response.json();
    } catch (err: any) {
      throw new VoiceProviderError({
        message: 'Malformed JSON response from Sarvam TTS',
        code: 'TTS_PROVIDER_ERROR',
        statusCode: 502,
        retryable: true,
        cause: err,
      });
    }

    // Sarvam API returns { audios: ["base64string..."] }
    const audioBase64 = Array.isArray(data?.audios) ? data.audios[0] : null;
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      throw new VoiceProviderError({
        message: 'No audio data received in Sarvam TTS response',
        code: 'TTS_PROVIDER_ERROR',
        statusCode: 502,
        retryable: true,
      });
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    return {
      audioBuffer,
      contentType: 'audio/wav',
      provider: 'sarvam',
    };
  }
}
