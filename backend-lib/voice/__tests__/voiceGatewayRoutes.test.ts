import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createVoiceSttRoute, resetSttProviderForTests } from '../voiceSttRoute.js';
import { createVoiceTtsRoute } from '../../api/routes/voiceTtsRoute.js';
import { resetTtsProviderForTests } from '../omniRouteTts.js';

describe('Voice Gateway HTTP Routes', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    resetSttProviderForTests();
    resetTtsProviderForTests();
  });

  describe('POST /api/voice/stt', () => {
    it('returns 400 when no audio is sent', async () => {
      const app = express();
      app.use(express.json());
      app.use('/api/voice', createVoiceSttRoute());

      const server = app.listen(0);
      const port = (server.address() as any).port;

      try {
        const res = await fetch(`http://localhost:${port}/api/voice/stt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        assert.equal(res.status, 400);
        const json = await res.json();
        assert.equal(json.code, 'STT_INVALID_AUDIO');
      } finally {
        server.close();
      }
    });

    it('returns 200 with transcript when audioBase64 is transcribed', async () => {
      process.env.SARVAM_API_KEY = 'valid-sarvam-key';

      const mockFetch = (async (url: string, init: any) => {
        if (typeof url === 'string' && url.includes('speech-to-text')) {
          return new Response(
            JSON.stringify({
              transcript: 'Rendu chicken biryani kavali',
              language_code: 'te-IN',
              confidence: 0.95,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return originalFetch(url, init);
      }) as any;
      globalThis.fetch = mockFetch;

      const app = express();
      app.use(express.json());
      app.use('/api/voice', createVoiceSttRoute());

      const server = app.listen(0);
      const port = (server.address() as any).port;

      try {
        const res = await fetch(`http://localhost:${port}/api/voice/stt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: Buffer.from('audio-data').toString('base64'),
            lang: 'te-IN',
          }),
        });

        const json = await res.json();
        assert.equal(res.status, 200, JSON.stringify(json));
        assert.equal(json.success, true);
        assert.equal(json.transcript, 'Rendu chicken biryani kavali');
        assert.equal(json.language, 'te-IN');
        assert.equal(json.provider, 'sarvam');
      } finally {
        server.close();
      }
    });

    it('handles provider error and returns 502 with error code', async () => {
      process.env.SARVAM_API_KEY = 'valid-sarvam-key';

      const mockFetch = (async (url: string, init: any) => {
        if (typeof url === 'string' && url.includes('speech-to-text')) {
          return new Response('Gateway error', { status: 500 });
        }
        return originalFetch(url, init);
      }) as any;
      globalThis.fetch = mockFetch;

      const app = express();
      app.use(express.json());
      app.use('/api/voice', createVoiceSttRoute());

      const server = app.listen(0);
      const port = (server.address() as any).port;

      try {
        const res = await fetch(`http://localhost:${port}/api/voice/stt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: Buffer.from('audio-data').toString('base64'),
          }),
        });

        assert.equal(res.status, 502);
        const json = await res.json();
        assert.equal(json.success, false);
        assert.equal(json.code, 'STT_PROVIDER_ERROR');
      } finally {
        server.close();
      }
    });
  });

  describe('POST /api/voice/tts', () => {
    it('returns audio/wav when synthesized via Sarvam Bulbul v3', async () => {
      process.env.FF_OB_VOICE_PROVIDER = 'sarvam';
      process.env.SARVAM_API_KEY = 'valid-sarvam-key';

      const audioBase64 = Buffer.from('RIFF-wav-header-and-sound').toString('base64');
      const mockFetch = (async (url: string, init: any) => {
        if (typeof url === 'string' && url.includes('text-to-speech')) {
          return new Response(
            JSON.stringify({
              audios: [audioBase64],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return originalFetch(url, init);
      }) as any;
      globalThis.fetch = mockFetch;

      const app = express();
      app.use(express.json());
      app.use('/api/voice', createVoiceTtsRoute());

      const server = app.listen(0);
      const port = (server.address() as any).port;

      try {
        const res = await fetch(`http://localhost:${port}/api/voice/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'Mee order confirm ayindi',
            lang: 'te-IN',
          }),
        });

        assert.equal(res.status, 200);
        assert.equal(res.headers.get('content-type'), 'audio/wav');
        assert.equal(res.headers.get('x-voice-provider'), 'sarvam');
        const buf = Buffer.from(await res.arrayBuffer());
        assert.equal(buf.toString('utf8'), 'RIFF-wav-header-and-sound');
      } finally {
        server.close();
      }
    });
  });
});
