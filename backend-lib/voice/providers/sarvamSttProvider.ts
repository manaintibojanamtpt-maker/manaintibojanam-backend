/**
 * Purpose: Sarvam AI Speech-to-Text (STT) implementation using Saaras v4.
 * Public API: SarvamSttProvider
 * Dependencies: ISttProvider, SttRequest, SttResult, VoiceProviderError
 */

import type { ISttProvider, SttRequest, SttResult } from './types.js';
import { VoiceProviderError } from './types.js';
import { normalizeSttModel } from '../voiceConfig.js';

export interface SarvamSttOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly defaultLanguage?: string;
}

export class SarvamSttProvider implements ISttProvider {
  public readonly providerName = 'sarvam';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly defaultLanguage: string;

  constructor(options: SarvamSttOptions) {
    if (!options.apiKey || !options.apiKey.trim()) {
      throw new VoiceProviderError({
        message: 'SARVAM_API_KEY is not configured',
        code: 'STT_AUTH_ERROR',
        statusCode: 401,
      });
    }
    this.apiKey = options.apiKey.trim().replace(/^["']|["']$/g, '');
    this.baseUrl = (options.baseUrl || 'https://api.sarvam.ai').replace(/\/$/, '');
    this.model = normalizeSttModel(options.model);
    this.defaultLanguage = (options.defaultLanguage || 'unknown').replace(/^["']|["']$/g, '').trim();
  }

  public async transcribe(request: SttRequest, signal?: AbortSignal): Promise<SttResult> {
    if (!request.audioBuffer || request.audioBuffer.length === 0) {
      throw new VoiceProviderError({
        message: 'Audio buffer cannot be empty',
        code: 'STT_INVALID_AUDIO',
        statusCode: 400,
      });
    }

    const language = request.language?.trim() || this.defaultLanguage;
    const mimeType = request.mimeType || 'audio/wav';
    const extension = mimeType.includes('mp3')
      ? 'mp3'
      : mimeType.includes('ogg')
      ? 'ogg'
      : mimeType.includes('webm')
      ? 'webm'
      : mimeType.includes('aac')
      ? 'aac'
      : 'wav';

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(request.audioBuffer)], { type: mimeType });
    formData.append('file', blob, `input.${extension}`);
    formData.append('model', this.model);
    if (language) {
      formData.append('language_code', language);
    }
    if (request.prompt) {
      formData.append('prompt', request.prompt);
    }
    if (request.withDiarization) {
      formData.append('with_diarization', 'true');
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/speech-to-text`, {
        method: 'POST',
        headers: {
          'api-subscription-key': this.apiKey,
        },
        body: formData,
        signal,
      });
    } catch (err: any) {
      if (signal?.aborted || err?.name === 'AbortError') {
        throw new VoiceProviderError({
          message: 'STT request was timed out or aborted',
          code: 'STT_TIMEOUT',
          statusCode: 408,
          retryable: true,
          cause: err,
        });
      }
      throw new VoiceProviderError({
        message: `Failed to connect to Sarvam STT: ${err?.message || String(err)}`,
        code: 'STT_CONNECTION_ERROR',
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
          message: 'Authentication failed with Sarvam API',
          code: 'STT_AUTH_ERROR',
          statusCode: 401,
        });
      }
      if (status === 429) {
        throw new VoiceProviderError({
          message: 'Sarvam STT rate limit reached',
          code: 'STT_RATE_LIMIT',
          statusCode: 429,
          retryable: true,
        });
      }
      if (status >= 400 && status < 500) {
        throw new VoiceProviderError({
          message: `Sarvam STT rejected audio input: ${errorText}`,
          code: 'STT_INVALID_AUDIO',
          statusCode: status,
          retryable: false,
        });
      }
      throw new VoiceProviderError({
        message: `Sarvam STT provider error (${status}): ${errorText}`,
        code: 'STT_PROVIDER_ERROR',
        statusCode: 502,
        retryable: true,
      });
    }

    let data: any;
    try {
      data = await response.json();
    } catch (err: any) {
      throw new VoiceProviderError({
        message: 'Malformed JSON response from Sarvam STT',
        code: 'STT_PROVIDER_ERROR',
        statusCode: 502,
        retryable: true,
        cause: err,
      });
    }

    const transcript = typeof data?.transcript === 'string' ? data.transcript.trim() : '';
    const detectedLanguage = typeof data?.language_code === 'string' ? data.language_code : language;

    return {
      transcript,
      language: detectedLanguage,
      confidence: typeof data?.confidence === 'number' ? data.confidence : undefined,
      isFinal: true,
      provider: 'sarvam',
      metadata: {
        model: this.model,
        diarized: Boolean(data?.diarized),
      },
    };
  }
}
