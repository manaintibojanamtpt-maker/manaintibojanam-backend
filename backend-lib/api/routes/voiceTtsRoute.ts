import { Router } from 'express';
import { generateTtsAudio } from '../../voice/omniRouteTts.js';

export function createVoiceTtsRoute(): Router {
  const router = Router();

  router.post('/tts', async (req: any, res: any) => {
    try {
      const { text, voiceId } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required and must be a string' });
      }

      const audioBuffer = await generateTtsAudio(text, voiceId);

      res.set('Content-Type', 'audio/mpeg');
      res.set('Content-Length', audioBuffer.length.toString());
      res.status(200).send(audioBuffer);
    } catch (err) {
      console.error('[VoiceGateway] TTS Error:', err);
      // Fallback: Send a 502 Bad Gateway to signal the client to fallback to native TTS
      res.status(502).json({ error: 'TTS Provider failed' });
    }
  });

  return router;
}
