import { Router } from 'express';
import type { ISttProvider, SttResult } from './providers/types.js';
import { SarvamSttProvider } from './providers/sarvamSttProvider.js';
import { readVoiceConfig } from './voiceConfig.js';
import { VoiceProviderError } from './providers/types.js';

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

export function createVoiceSttRoute(): Router {
  const router = Router();

  // Raw audio buffer or base64 JSON payload
  router.post('/stt', async (req: any, res: any) => {
    const startedAt = Date.now();
    try {
      let audioBuffer: Buffer | null = null;
      let mimeType = 'audio/wav';
      let language = 'unknown';
      let prompt: string | undefined;

      if (Buffer.isBuffer(req.body)) {
        audioBuffer = req.body;
        mimeType = req.headers['content-type'] || 'audio/wav';
        language = (req.query.lang as string) || (req.headers['x-voice-lang'] as string) || 'unknown';
      } else if (req.body && typeof req.body === 'object') {
        const { audioBase64, lang, mime, promptText } = req.body;
        if (typeof audioBase64 === 'string' && audioBase64.trim()) {
          audioBuffer = Buffer.from(audioBase64, 'base64');
        }
        if (typeof mime === 'string') mimeType = mime;
        if (typeof lang === 'string') language = lang;
        if (typeof promptText === 'string') prompt = promptText;
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Audio content is required (binary body or { audioBase64 })',
          code: 'STT_INVALID_AUDIO',
        });
      }

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
  });

  return router;
}
