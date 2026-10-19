/**
 * Purpose: Mocked contract validation for Sarvam AI provider integrations.
 * NOTE: All tests in this file use MOCKED fetch and WebSocket handlers.
 * No live network calls or credentials are used in these unit tests.
 */

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SarvamTtsProvider } from '../providers/sarvamTtsProvider.js';
import { SarvamStreamingTtsProvider } from '../providers/sarvamStreamingTtsProvider.js';
import { resolveRecommendedSpeaker, normalizeTtsModel } from '../voiceConfig.js';

describe('Sarvam Mocked Contract & Parameter Serialization Tests (Mocked Fetch)', () => {
  const mockApiKey = 'sk_test_mock_sarvam_key_12345';
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('Configuration & Speaker Resolution Contracts', () => {
    it('normalizes tts models with bulbul:v4-flash as candidate default and bulbul:v3 for rollback', () => {
      assert.equal(normalizeTtsModel('bulbul:v3'), 'bulbul:v3');
      assert.equal(normalizeTtsModel('bulbul:v4-flash'), 'bulbul:v4-flash');
      assert.equal(normalizeTtsModel('bulbul:v4'), 'bulbul:v4');
      assert.equal(normalizeTtsModel('bulbul:v2'), 'bulbul:v2');
      assert.equal(normalizeTtsModel(undefined), 'bulbul:v4-flash');
    });

    it('resolves official Bulbul v3 legacy speaker names', () => {
      assert.equal(resolveRecommendedSpeaker('te-IN', undefined, 'bulbul:v3'), 'kavitha');
      assert.equal(resolveRecommendedSpeaker('te', undefined, 'bulbul:v3'), 'kavitha');
      assert.equal(resolveRecommendedSpeaker('hi-IN', undefined, 'bulbul:v3'), 'shubh');
      assert.equal(resolveRecommendedSpeaker('hi', undefined, 'bulbul:v3'), 'shubh');
      assert.equal(resolveRecommendedSpeaker('en-IN', undefined, 'bulbul:v3'), 'aditya');
      assert.equal(resolveRecommendedSpeaker('ta-IN', undefined, 'bulbul:v3'), 'pavithra');
      assert.equal(resolveRecommendedSpeaker('kn-IN', undefined, 'bulbul:v3'), 'pavithra');
      assert.equal(resolveRecommendedSpeaker('en-IN', 'custom_voice', 'bulbul:v3'), 'custom_voice');
    });

    it('resolves Bulbul v4 Flash persona IDs', () => {
      assert.equal(resolveRecommendedSpeaker('en-IN', undefined, 'bulbul:v4-flash'), 'simran_en_customer');
      assert.equal(resolveRecommendedSpeaker('hi-IN', undefined, 'bulbul:v4-flash'), 'ishita_enhi_customer');
      assert.equal(resolveRecommendedSpeaker('te-IN', undefined, 'bulbul:v4-flash'), 'kavitha_te_conversation');
    });
  });

  describe('SarvamTtsProvider Mocked REST Contract', () => {
    it('throws 401 when API key is missing', () => {
      assert.throws(
        () => new SarvamTtsProvider({ apiKey: '' }),
        (err: any) => err.code === 'TTS_AUTH_ERROR' && err.statusCode === 401,
      );
    });

    it('successfully calls REST endpoint with Bulbul v3 and parses RIFF WAV audio', async () => {
      const mockWavHeader = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
      const mockAudioBase64 = mockWavHeader.toString('base64');

      let callCount = 0;
      let capturedUrl = '';
      let capturedBody: any = null;

      globalThis.fetch = (async (url: string, init: any) => {
        callCount++;
        capturedUrl = url;
        capturedBody = JSON.parse(init.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ audios: [mockAudioBase64] }),
        } as any;
      }) as typeof fetch;

      const provider = new SarvamTtsProvider({
        apiKey: mockApiKey,
        model: 'bulbul:v3',
      });

      const result = await provider.generateSpeech({
        text: 'నమస్కారం! మన ఇంటి భోజనానికి స్వాగతం.',
        language: 'te-IN',
      });

      assert.equal(callCount, 1);
      assert.equal(capturedUrl, 'https://api.sarvam.ai/text-to-speech');
      assert.equal(capturedBody.model, 'bulbul:v3');
      assert.equal(capturedBody.target_language_code, 'te-IN');
      assert.equal(capturedBody.speaker, 'kavitha');
      assert.equal(capturedBody.speech_sample_rate, 22050);

      assert.equal(result.contentType, 'audio/wav');
      assert.ok(result.audioBuffer);
    });

    it('safely falls back from bulbul:v4-flash to bulbul:v3 when persona ID returns 400/422', async () => {
      const mockWavHeader = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
      const mockAudioBase64 = mockWavHeader.toString('base64');

      const calls: any[] = [];
      globalThis.fetch = (async (url: string, init: any) => {
        const body = JSON.parse(init.body);
        calls.push({ url, body });
        if (calls.length === 1) {
          return {
            ok: false,
            status: 400,
            text: async () => 'Invalid persona/speaker ID for v4-flash',
          } as any;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ audios: [mockAudioBase64] }),
        } as any;
      }) as typeof fetch;

      const provider = new SarvamTtsProvider({
        apiKey: mockApiKey,
        model: 'bulbul:v4-flash',
      });

      const result = await provider.generateSpeech({
        text: 'नमस्ते, आपका स्वागत है।',
        language: 'hi-IN',
      });

      assert.equal(calls.length, 2);
      assert.equal(calls[0].body.model, 'bulbul:v4-flash');
      assert.equal(calls[1].body.model, 'bulbul:v3');
      assert.equal(calls[1].body.speaker, 'shubh');
      assert.equal(result.contentType, 'audio/wav');
    });
  });

  describe('SarvamStreamingTtsProvider Mocked Fallback Contract', () => {
    it('safely falls back to batch endpoint when streaming endpoint returns 404', async () => {
      const mockWavHeader = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
      const mockAudioBase64 = mockWavHeader.toString('base64');

      const calls: string[] = [];
      globalThis.fetch = (async (url: string) => {
        calls.push(url);
        if (calls.length === 1) {
          return {
            ok: false,
            status: 404,
            text: async () => 'Streaming endpoint not supported on this model',
          } as any;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ audios: [mockAudioBase64] }),
        } as any;
      }) as typeof fetch;

      const streamingProvider = new SarvamStreamingTtsProvider({
        apiKey: mockApiKey,
        model: 'bulbul:v3',
      });

      const chunks: Buffer[] = [];
      for await (const chunk of streamingProvider.generateSpeechStream({
        text: 'Hello, your order is ready.',
        language: 'en-IN',
      })) {
        chunks.push(chunk);
      }

      assert.equal(calls.length, 2);
      assert.equal(chunks.length, 1);
      assert.ok(chunks[0].length > 0);
    });
  });
});
