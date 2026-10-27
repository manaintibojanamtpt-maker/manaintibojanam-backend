/**
 * Purpose: Sarvam AI Streaming Text-to-Speech (TTS) implementation using Bulbul v3.
 * Public API: SarvamStreamingTtsProvider
 * Dependencies: IStreamingTtsProvider, TtsRequest, VoiceProviderError
 */

import type { IStreamingTtsProvider, TtsRequest } from './types.js';
import { VoiceProviderError } from './types.js';
import { normalizeTtsModel, resolveRecommendedSpeaker } from '../voiceConfig.js';

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

    const speaker = resolveRecommendedSpeaker(languageCode, request.voiceId || this.defaultVoice, this.model);
    const isBulbulV3OrV4 = this.model.startsWith('bulbul:v3') || this.model.startsWith('bulbul:v4');
    const streamPayload: Record<string, any> = {
      text,
      target_language_code: languageCode,
      speaker: speaker.toLowerCase(),
      pace: request.pace ?? 1.0,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: this.model,
    };
    if (!isBulbulV3OrV4) {
      streamPayload.pitch = 0;
      streamPayload.loudness = 1.0;
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/text-to-speech/stream`, {
        method: 'POST',
        headers: {
          'api-subscription-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(streamPayload),
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

      // Distinguish malformed input from unsupported model/speaker or endpoint availability
      const isInputError = status === 400 && !/speaker|persona|model|not found|unsupported|stream/i.test(errorText);
      if (isInputError) {
        throw new VoiceProviderError({
          message: `Malformed input to Sarvam streaming TTS (400): ${errorText}`,
          code: 'TTS_PROVIDER_ERROR',
          statusCode: 400,
          retryable: false,
        });
      }

      // Safe bounded fallback to batch endpoint (only before any audio stream has started)
      yield* this.fallbackToBatch(text, languageCode, speaker, request.pace ?? 1.0, isBulbulV3OrV4, signal);
      return;
    }

    if (!response.body) {
      throw new VoiceProviderError({
        message: 'No response body stream received from Sarvam TTS',
        code: 'TTS_PROVIDER_ERROR',
        statusCode: 502,
      });
    }

    const reader = response.body.getReader();
    let chunksEmitted = 0;
    try {
      while (true) {
        if (signal?.aborted) {
          await reader.cancel().catch(() => {});
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        if (value && value.byteLength > 0) {
          chunksEmitted++;
          yield Buffer.from(value);
        }
      }
    } catch (streamErr: any) {
      // Never append fallback audio to an already-started partial response
      if (chunksEmitted > 0) {
        throw new VoiceProviderError({
          message: `Sarvam streaming TTS failed after ${chunksEmitted} chunks emitted; aborting stream safely`,
          code: 'TTS_PROVIDER_ERROR',
          statusCode: 502,
          cause: streamErr,
        });
      }
      throw streamErr;
    } finally {
      reader.releaseLock();
    }
  }

  private async *fallbackToBatch(
    text: string,
    languageCode: string,
    speaker: string,
    pace: number,
    isBulbulV3OrV4: boolean,
    signal?: AbortSignal,
  ): AsyncIterable<Buffer> {
    const fallbackStart = Date.now();
    const batchPayload: Record<string, any> = {
      inputs: [text],
      target_language_code: languageCode,
      speaker: speaker.toLowerCase(),
      pace,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: this.model,
    };
    if (!isBulbulV3OrV4) {
      batchPayload.pitch = 0;
      batchPayload.loudness = 1.0;
    }

    let res = await fetch(`${this.baseUrl}/text-to-speech`, {
      method: 'POST',
      headers: {
        'api-subscription-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchPayload),
      signal,
    }).catch(() => null);

    // If initial payload failed on model/speaker incompatibility, retry with bulbul:v3 and v3 speaker
    if (!res || !res.ok) {
      const v3Speaker = resolveRecommendedSpeaker(languageCode, undefined, 'bulbul:v3');
      const fallbackPayload: Record<string, any> = {
        inputs: [text],
        target_language_code: languageCode,
        speaker: v3Speaker,
        pace,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: 'bulbul:v3',
      };
      res = await fetch(`${this.baseUrl}/text-to-speech`, {
        method: 'POST',
        headers: {
          'api-subscription-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fallbackPayload),
        signal,
      }).catch(() => null);
    }

    if (!res || !res.ok) {
      const errText = await res?.text?.().catch(() => '') || '';
      throw new VoiceProviderError({
        message: `Sarvam batch TTS fallback failed (${res?.status || 502}): ${errText}`,
        code: 'TTS_PROVIDER_ERROR',
        statusCode: 502,
      });
    }

    const data: any = await res.json().catch(() => null);
    const audioBase64 = Array.isArray(data?.audios) ? data.audios[0] : null;
    if (audioBase64 && typeof audioBase64 === 'string') {
      const fallbackLatencyMs = Date.now() - fallbackStart;
      // Audio chunk emitted with bounded batch fallback
      yield Buffer.from(audioBase64, 'base64');
    }
  }
}
