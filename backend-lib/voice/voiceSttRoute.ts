import { Router } from 'express';
import type { ISttProvider, SttResult } from './providers/types.js';
import { SarvamSttProvider } from './providers/sarvamSttProvider.js';
import { readVoiceConfig } from './voiceConfig.js';
import { VoiceProviderError } from './providers/types.js';
import { sanitizeKeyterms, fetchRestaurantDishesKeyterms } from './voiceKeyterms.js';

let activeSttProvider: ISttProvider | null = null;

export function getSttProvider(): ISttProvider {
  if (activeSttProvider) return activeSttProvider;

  const config = readVoiceConfig();

  if (config.sarvamApiKey) {
    activeSttProvider = new SarvamSttProvider({
      apiKey: config.sarvamApiKey,
      baseUrl: config.sarvamBaseUrl,
      model: config.sarvamSttModel,
      defaultLanguage: config.sarvamSttLanguage,
    });
    return activeSttProvider;
  }

  throw new VoiceProviderError({
    message: 'SARVAM_API_KEY is not configured on the server',
    code: 'STT_AUTH_ERROR',
    statusCode: 503,
  });
}

export function resetSttProviderForTests(): void {
  activeSttProvider = null;
}

export interface VoiceSttRouteOptions {
  db?: any;
}

export function createVoiceSttRoute(options: VoiceSttRouteOptions = {}): Router {
  const router = Router();

  const handleTranscription = async (req: any, res: any) => {
    const startedAt = Date.now();
    try {
      let audioBuffer: Buffer | null = null;
      let mimeType = 'audio/wav';
      let language = 'unknown';
      let prompt: string | undefined;
      let rawKeyterms: any = null;
      let restaurantIdOrSlug: string | undefined;
      let withTimestamps = false;
      let inputAudioCodec: string | undefined;

      if (Buffer.isBuffer(req.body)) {
        audioBuffer = req.body;
        mimeType = req.headers['content-type'] || 'audio/wav';
        language = (req.query.lang as string) || (req.query.language_code as string) || (req.headers['x-voice-lang'] as string) || 'unknown';
        rawKeyterms = req.query.keyterms || req.headers['x-voice-keyterms'];
        restaurantIdOrSlug = (req.query.restaurantId as string) || (req.query.restaurantSlug as string) || (req.headers['x-restaurant-id'] as string);
        withTimestamps = req.query.with_timestamps === 'true' || req.query.withTimestamps === 'true';
        inputAudioCodec = (req.query.input_audio_codec as string) || (req.headers['x-audio-codec'] as string);
      } else if (req.body && typeof req.body === 'object') {
        const {
          audioBase64,
          audio,
          lang,
          language_code,
          mime,
          mimeType: bodyMime,
          promptText,
          prompt: bodyPrompt,
          keyterms,
          restaurantId,
          restaurantSlug,
          withTimestamps: bodyWithTimestamps,
          with_timestamps,
          inputAudioCodec: bodyInputAudioCodec,
          input_audio_codec,
        } = req.body;

        const base64Data = audioBase64 || audio;
        if (typeof base64Data === 'string' && base64Data.trim()) {
          audioBuffer = Buffer.from(base64Data, 'base64');
        }

        if (typeof bodyMime === 'string') mimeType = bodyMime;
        else if (typeof mime === 'string') mimeType = mime;

        if (typeof lang === 'string') language = lang;
        else if (typeof language_code === 'string') language = language_code;

        if (typeof promptText === 'string') prompt = promptText;
        else if (typeof bodyPrompt === 'string') prompt = bodyPrompt;

        rawKeyterms = keyterms ?? req.query.keyterms ?? req.headers['x-voice-keyterms'];
        restaurantIdOrSlug = restaurantId ?? restaurantSlug ?? req.query.restaurantId ?? req.query.restaurantSlug;
        withTimestamps = bodyWithTimestamps === true || with_timestamps === true || req.query.with_timestamps === 'true';
        inputAudioCodec = bodyInputAudioCodec || input_audio_codec || req.query.input_audio_codec;
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Audio content is required (binary body or { audioBase64 })',
          code: 'STT_INVALID_AUDIO',
        });
      }

      // Collect keyterms from caller + active restaurant dishes
      const userKeyterms = sanitizeKeyterms(rawKeyterms);
      let dynamicRestaurantDishes: string[] = [];

      if (restaurantIdOrSlug && options.db) {
        dynamicRestaurantDishes = await fetchRestaurantDishesKeyterms(
          options.db,
          restaurantIdOrSlug,
          Math.max(0, 50 - userKeyterms.length),
        );
      }

      // Combine user keyterms and menu dish names up to 50 terms, 64 chars max
      const combinedKeyterms = sanitizeKeyterms(
        [...userKeyterms, ...dynamicRestaurantDishes],
        50,
        64,
      );

      const provider = getSttProvider();
      const config = readVoiceConfig();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.sttTimeoutMs);

      let result: SttResult;
      try {
        result = await provider.transcribe(
          {
            audioBuffer,
            mimeType,
            language,
            prompt,
            keyterms: combinedKeyterms.length > 0 ? combinedKeyterms : undefined,
            withTimestamps,
            inputAudioCodec,
          },
          controller.signal,
        );
      } finally {
        clearTimeout(timeoutId);
      }

      const latencyMs = Date.now() - startedAt;

      res.status(200).json({
        success: true,
        transcript: result.transcript,
        language: result.language,
        confidence: result.confidence,
        isFinal: result.isFinal,
        provider: result.provider,
        model: 'saaras:v4',
        requestId: result.requestId,
        timestamps: result.timestamps,
        keytermsUsedCount: combinedKeyterms.length,
        latencyMs,
      });
    } catch (err: any) {
      console.error('[VoiceGateway] STT Error:', err?.message || err);
      const statusCode = err?.statusCode || 502;
      res.status(statusCode).json({
        success: false,
        error: err?.message || 'STT transcription failed',
        code: err?.code || 'STT_PROVIDER_ERROR',
        retryable: err?.retryable ?? false,
      });
    }
  };

  // Primary endpoint & alias
  router.post('/stt', handleTranscription);
  router.post('/transcribe', handleTranscription);

  return router;
}
