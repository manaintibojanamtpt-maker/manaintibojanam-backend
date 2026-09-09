import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SarvamSttProvider } from '../providers/sarvamSttProvider.js';
import { SarvamTtsProvider } from '../providers/sarvamTtsProvider.js';
import { VoiceProviderError } from '../providers/types.js';
import { getTtsProvider, resetTtsProviderForTests } from '../omniRouteTts.js';

describe('Sarvam AI Voice Providers', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    resetTtsProviderForTests();
  });

  describe('SarvamSttProvider', () => {
    it('throws STT_AUTH_ERROR when apiKey is missing', () => {
      assert.throws(
        () => new SarvamSttProvider({ apiKey: '' }),
        (err: any) => err instanceof VoiceProviderError && err.code === 'STT_AUTH_ERROR',
      );
    });

    it('throws STT_INVALID_AUDIO when audioBuffer is empty', async () => {
      const provider = new SarvamSttProvider({ apiKey: 'test-key' });
      await assert.rejects(
        provider.transcribe({ audioBuffer: Buffer.alloc(0) }),
        (err: any) => err instanceof VoiceProviderError && err.code === 'STT_INVALID_AUDIO',
      );
    });

    it('transcribes successfully with auto language detection (Saaras v4)', async () => {
      globalThis.fetch = (async (url: string, init: any) => {
        assert.ok(url.endsWith('/speech-to-text'));
        assert.equal(init.headers['api-subscription-key'], 'test-key');
        return new Response(
          JSON.stringify({
            transcript: 'Anna rendu chicken biryani parcel cheyyandi',
            language_code: 'te-IN',
            confidence: 0.94,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }) as any;

      const provider = new SarvamSttProvider({ apiKey: 'test-key' });
      const result = await provider.transcribe({
        audioBuffer: Buffer.from('fake-audio-wav-data'),
        mimeType: 'audio/wav',
        language: 'unknown',
      });

      assert.equal(result.transcript, 'Anna rendu chicken biryani parcel cheyyandi');
      assert.equal(result.language, 'te-IN');
      assert.equal(result.confidence, 0.94);
      assert.equal(result.provider, 'sarvam');
      assert.equal(result.isFinal, true);
    });

    it('handles multilingual & code-mixed inputs correctly', async () => {
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({
            transcript: 'Ek paneer biryani add karo',
            language_code: 'hi-IN',
            confidence: 0.98,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }) as any;

      const provider = new SarvamSttProvider({ apiKey: 'test-key' });
      const result = await provider.transcribe({
        audioBuffer: Buffer.from('fake-audio-data'),
      });

      assert.equal(result.transcript, 'Ek paneer biryani add karo');
      assert.equal(result.language, 'hi-IN');
    });

    it('normalizes rate limit error to STT_RATE_LIMIT (429)', async () => {
      globalThis.fetch = (async () => {
        return new Response('Too many requests', { status: 429 });
      }) as any;

      const provider = new SarvamSttProvider({ apiKey: 'test-key' });
      await assert.rejects(
        provider.transcribe({ audioBuffer: Buffer.from('audio') }),
        (err: any) => err instanceof VoiceProviderError && err.code === 'STT_RATE_LIMIT' && err.statusCode === 429,
      );
    });

    it('normalizes authentication error to STT_AUTH_ERROR (401)', async () => {
      globalThis.fetch = (async () => {
        return new Response('Unauthorized', { status: 401 });
      }) as any;

      const provider = new SarvamSttProvider({ apiKey: 'bad-key' });
      await assert.rejects(
        provider.transcribe({ audioBuffer: Buffer.from('audio') }),
        (err: any) => err instanceof VoiceProviderError && err.code === 'STT_AUTH_ERROR' && err.statusCode === 401,
      );
    });

    it('normalizes network connection failure to STT_CONNECTION_ERROR', async () => {
      globalThis.fetch = (async () => {
        throw new Error('ECONNREFUSED');
      }) as any;

      const provider = new SarvamSttProvider({ apiKey: 'test-key' });
      await assert.rejects(
        provider.transcribe({ audioBuffer: Buffer.from('audio') }),
        (err: any) => err instanceof VoiceProviderError && err.code === 'STT_CONNECTION_ERROR' && err.retryable === true,
      );
    });

    it('handles timeout when AbortSignal triggers', async () => {
      globalThis.fetch = (async (_url: string, init: any) => {
        return new Promise((_, reject) => {
          if (init?.signal?.aborted) {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
            return;
          }
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      }) as any;

      const ac = new AbortController();
      const provider = new SarvamSttProvider({ apiKey: 'test-key' });
      const promise = provider.transcribe({ audioBuffer: Buffer.from('audio') }, ac.signal);
      ac.abort();

      await assert.rejects(
        promise,
        (err: any) => err instanceof VoiceProviderError && err.code === 'STT_TIMEOUT',
      );
    });
  });

  describe('SarvamTtsProvider', () => {
    it('throws TTS_AUTH_ERROR when apiKey is missing', () => {
      assert.throws(
        () => new SarvamTtsProvider({ apiKey: '' }),
        (err: any) => err instanceof VoiceProviderError && err.code === 'TTS_AUTH_ERROR',
      );
    });

    it('synthesizes speech successfully with Bulbul v3', async () => {
      const sampleAudioBase64 = Buffer.from('RIFF-sample-audio-wav').toString('base64');
      globalThis.fetch = (async (url: string, init: any) => {
        assert.ok(url.endsWith('/text-to-speech'));
        assert.equal(init.headers['api-subscription-key'], 'test-tts-key');
        const body = JSON.parse(init.body);
        assert.equal(body.inputs[0], 'Order confirmed');
        assert.equal(body.speaker, 'aditya');
        return new Response(
          JSON.stringify({
            audios: [sampleAudioBase64],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }) as any;

      const provider = new SarvamTtsProvider({ apiKey: 'test-tts-key', defaultVoice: 'aditya' });
      const result = await provider.generateSpeech({
        text: 'Order confirmed',
        language: 'en-IN',
      });

      assert.equal(result.provider, 'sarvam');
      assert.equal(result.contentType, 'audio/wav');
      assert.ok(result.audioBuffer.length > 0);
    });

    it('normalizes TTS rate limit to TTS_RATE_LIMIT', async () => {
      globalThis.fetch = (async () => {
        return new Response('Rate limited', { status: 429 });
      }) as any;

      const provider = new SarvamTtsProvider({ apiKey: 'test-key' });
      await assert.rejects(
        provider.generateSpeech({ text: 'Hello' }),
        (err: any) => err instanceof VoiceProviderError && err.code === 'TTS_RATE_LIMIT',
      );
    });

    it('normalizes TTS connection failure to TTS_CONNECTION_ERROR', async () => {
      globalThis.fetch = (async () => {
        throw new Error('Network error');
      }) as any;

      const provider = new SarvamTtsProvider({ apiKey: 'test-key' });
      await assert.rejects(
        provider.generateSpeech({ text: 'Hello' }),
        (err: any) => err instanceof VoiceProviderError && err.code === 'TTS_CONNECTION_ERROR' && err.retryable === true,
      );
    });
  });

  describe('OmniRouteTts Factory & Fallback', () => {
    it('routes to Sarvam when FF_OB_VOICE_PROVIDER=sarvam and SARVAM_API_KEY is present', async () => {
      process.env.FF_OB_VOICE_PROVIDER = 'sarvam';
      process.env.SARVAM_API_KEY = 'sarvam-key-123';

      const provider = getTtsProvider();
      assert.equal(provider.providerName, 'sarvam');
    });

    it('falls back to OpenAI when mode is legacy and OPENAI_API_KEY is set', async () => {
      process.env.FF_OB_VOICE_PROVIDER = 'legacy';
      process.env.SARVAM_API_KEY = 'sarvam-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';

      const provider = getTtsProvider();
      assert.equal(provider.providerName, 'openai');
    });

    it('uses Sarvam in auto mode when SARVAM_API_KEY is available', async () => {
      process.env.FF_OB_VOICE_PROVIDER = 'auto';
      process.env.SARVAM_API_KEY = 'sarvam-key-123';

      const provider = getTtsProvider();
      assert.equal(provider.providerName, 'sarvam');
    });
  });
});
