import { Router } from 'express';
import { generateTtsAudio } from '../../voice/omniRouteTts.js';

export function createVoiceTtsRoute(): Router {
  const router = Router();

  router.post('/tts', async (req: any, res: any) => {
    try {
      const { text, voiceId, lang } = req.body || {};
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required and must be a string' });
      }

      const { audioBuffer, contentType, provider } = await generateTtsAudio(text, {
        voiceId,
        lang: typeof lang === 'string' ? lang : undefined,
      });

      res.set('Content-Type', contentType || 'audio/mpeg');
      res.set('Content-Length', audioBuffer.length.toString());
      res.set('X-Voice-Provider', provider);
      res.status(200).send(audioBuffer);
    } catch (err: any) {
      console.error('[VoiceGateway] TTS Error:', err?.message || err);
      // Fallback: Send a 502 Bad Gateway with normalized error code to signal client fallback
      const statusCode = err?.statusCode || 502;
      res.status(statusCode).json({
        error: 'TTS Provider failed',
        code: err?.code || 'TTS_PROVIDER_ERROR',
        message: err?.message || 'Failed to synthesize audio',
      });
    }
  });

  return router;
}
