import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'http';
import { io as ioClient } from 'socket.io-client';
import { SarvamStreamingSttProvider, SarvamStreamingSttSession } from '../providers/sarvamStreamingSttProvider.js';
import { SarvamStreamingTtsProvider } from '../providers/sarvamStreamingTtsProvider.js';
import { setupVoiceGatewayWebSocket } from '../voiceGatewayWs.js';

describe('Phase 4B: Sarvam Realtime Streaming STT & TTS', () => {
  const originalFetch = globalThis.fetch;
  const originalWebSocket = (globalThis as any).WebSocket;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    (globalThis as any).WebSocket = originalWebSocket;
  });

  describe('SarvamStreamingSttProvider & Session', () => {
    it('throws STT_AUTH_ERROR when apiKey is missing', () => {
      assert.throws(
        () => new SarvamStreamingSttProvider({ apiKey: '' }),
        (err: any) => err.code === 'STT_AUTH_ERROR' && err.statusCode === 401,
      );
    });

    it('initializes session and emits partial and final transcripts', async () => {
      let createdWsUrl = '';
      let sentMessages: string[] = [];

      class MockWebSocket {
        public readyState = 1;
        public onopen: any = null;
        public onmessage: any = null;
        public onerror: any = null;
        public onclose: any = null;

        constructor(url: string) {
          createdWsUrl = url;
          setTimeout(() => {
            this.onopen?.();
          }, 5);
        }

        send(data: string) {
          sentMessages.push(data);
        }

        close() {
          this.readyState = 3;
          this.onclose?.({ code: 1000 });
        }
      }

      (globalThis as any).WebSocket = MockWebSocket;

      const provider = new SarvamStreamingSttProvider({
        apiKey: 'test-sarvam-key',
        model: 'saaras:v4-realtime',
        defaultLanguage: 'te-IN',
      });

      const session = await provider.startStreamingSession({ language: 'te-IN' });

      assert.match(createdWsUrl, /speech-to-text-realtime\/ws/);
      assert.match(createdWsUrl, /language_code=te-IN/);
      assert.match(createdWsUrl, /model=saaras%3Av4-realtime/);

      const partials: any[] = [];
      const finals: any[] = [];

      session.on('partial', (chunk) => partials.push(chunk));
      session.on('final', (chunk) => finals.push(chunk));

      await new Promise((r) => setTimeout(r, 15));

      // Send audio chunk
      const audioFrame = Buffer.from('mock-audio-pcm-16k');
      session.sendAudio(audioFrame);

      assert.equal(sentMessages.length, 1);
      const parsedMsg = JSON.parse(sentMessages[0]);
      assert.equal(parsedMsg.event, 'audio_input');
      assert.equal(parsedMsg.audio, audioFrame.toString('base64'));

      // Simulate partial event from Sarvam
      const wsInstance = (session as any).ws;
      wsInstance.onmessage?.({
        data: JSON.stringify({
          transcript: 'Anna rendu',
          is_final: false,
          language_code: 'te-IN',
        }),
      });

      assert.equal(partials.length, 1);
      assert.equal(partials[0].transcript, 'Anna rendu');
      assert.equal(partials[0].isFinal, false);

      // Simulate final event
      wsInstance.onmessage?.({
        data: JSON.stringify({
          transcript: 'Anna rendu chicken biryani parcel cheyyandi',
          is_final: true,
          language_code: 'te-IN',
        }),
      });

      assert.equal(finals.length, 1);
      assert.equal(finals[0].transcript, 'Anna rendu chicken biryani parcel cheyyandi');
      assert.equal(finals[0].isFinal, true);

      session.close();
      assert.equal((session as any).isConnected, false);
    });

    it('enforces backpressure detection when bufferedAmount exceeds threshold', async () => {
      class MockCongestedWs {
        public readyState = 1;
        public bufferedAmount = 200 * 1024; // 200 KB > 128 KB
        public onopen: any = null;
        public onclose: any = null;
        constructor() {
          setTimeout(() => this.onopen?.(), 5);
        }
        send() {}
        close() {}
      }

      (globalThis as any).WebSocket = MockCongestedWs;

      const provider = new SarvamStreamingSttProvider({
        apiKey: 'test-key',
        maxBufferedBytes: 128 * 1024,
      });

      const session = await provider.startStreamingSession();
      await new Promise((r) => setTimeout(r, 15));

      assert.equal(session.isCongested(), true);
      session.close();
    });

    it('handles cancellation and abort signal cleanly', async () => {
      let closed = false;
      class MockWs {
        public readyState = 1;
        public onopen: any = null;
        public onclose: any = null;
        constructor() {
          setTimeout(() => this.onopen?.(), 5);
        }
        send() {}
        close() {
          closed = true;
          this.onclose?.();
        }
      }

      (globalThis as any).WebSocket = MockWs;

      const abortController = new AbortController();
      const provider = new SarvamStreamingSttProvider({ apiKey: 'test-key' });
      const session = await provider.startStreamingSession({ signal: abortController.signal });

      await new Promise((r) => setTimeout(r, 15));
      abortController.abort();

      assert.equal(closed, true);
    });
  });

  describe('SarvamStreamingTtsProvider', () => {
    it('throws TTS_AUTH_ERROR when apiKey is missing', () => {
      assert.throws(
        () => new SarvamStreamingTtsProvider({ apiKey: '' }),
        (err: any) => err.code === 'TTS_AUTH_ERROR' && err.statusCode === 401,
      );
    });

    it('streams audio chunks progressively via AsyncIterable', async () => {
      const chunk1 = Buffer.from('wav-header-and-chunk-1');
      const chunk2 = Buffer.from('chunk-2-audio');
      const chunk3 = Buffer.from('chunk-3-audio');

      globalThis.fetch = async (url: any) => {
        if (String(url).includes('/text-to-speech/stream')) {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(chunk1));
              controller.enqueue(new Uint8Array(chunk2));
              controller.enqueue(new Uint8Array(chunk3));
              controller.close();
            },
          });
          return new Response(stream, { status: 200, headers: { 'Content-Type': 'audio/wav' } });
        }
        return new Response('Not Found', { status: 404 });
      };

      const provider = new SarvamStreamingTtsProvider({
        apiKey: 'test-sarvam-key',
        model: 'bulbul:v3',
        defaultVoice: 'aditya',
      });

      const receivedChunks: Buffer[] = [];
      for await (const chunk of provider.generateSpeechStream({ text: 'Namaskaram, em kavali?' })) {
        receivedChunks.push(chunk);
      }

      assert.equal(receivedChunks.length, 3);
      assert.equal(receivedChunks[0].toString(), 'wav-header-and-chunk-1');
      assert.equal(receivedChunks[1].toString(), 'chunk-2-audio');
      assert.equal(receivedChunks[2].toString(), 'chunk-3-audio');
    });

    it('falls back to batch TTS when /text-to-speech/stream returns 404', async () => {
      const fallbackWav = Buffer.from('fallback-batch-wav');

      globalThis.fetch = async (url: any) => {
        if (String(url).includes('/text-to-speech/stream')) {
          return new Response('Stream endpoint not found', { status: 404 });
        }
        if (String(url).endsWith('/text-to-speech')) {
          return new Response(
            JSON.stringify({
              audios: [fallbackWav.toString('base64')],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response('Not Found', { status: 404 });
      };

      const provider = new SarvamStreamingTtsProvider({
        apiKey: 'test-sarvam-key',
      });

      const chunks: Buffer[] = [];
      for await (const chunk of provider.generateSpeechStream({ text: 'Batch fallback test' })) {
        chunks.push(chunk);
      }

      assert.equal(chunks.length, 1);
      assert.equal(chunks[0].toString(), 'fallback-batch-wav');
    });
  });

  describe('Voice Gateway WebSocket End-to-End', () => {
    let httpServer: any;
    let port: number;
    let ioServer: any;

    beforeEach(async () => {
      httpServer = createServer();
      await new Promise<void>((resolve) => {
        httpServer.listen(0, () => {
          port = httpServer.address().port;
          resolve();
        });
      });
    });

    afterEach(async () => {
      if (ioServer) {
        await new Promise<void>((resolve) => ioServer.close(() => resolve()));
      }
      if (httpServer) {
        await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      }
    });

    it('authenticates and establishes real-time voice streaming session', async () => {
      let turnProcessed = false;

      // Mock streaming STT session
      const mockSttSession = new (class extends (await import('node:events')).EventEmitter {
        public isCongested() {
          return false;
        }
        public sendAudio() {}
        public endAudio() {}
        public close() {}
      })();

      const mockSttProvider: any = {
        providerName: 'sarvam',
        startStreamingSession: async () => mockSttSession,
      };

      const mockTtsProvider: any = {
        providerName: 'sarvam',
        generateSpeechStream: async function* () {
          yield Buffer.from('tts-chunk-1');
          yield Buffer.from('tts-chunk-2');
        },
      };

      ioServer = setupVoiceGatewayWebSocket(httpServer, {
        verifyToken: async (token) => (token === 'valid-token' ? { uid: 'usr_123' } : null),
        sttProvider: mockSttProvider,
        ttsProvider: mockTtsProvider,
        onTranscriptReceived: async (params) => {
          turnProcessed = true;
          assert.equal(params.transcript, 'Chicken biryani kavali');
          assert.equal(params.userId, 'usr_123');
          return {
            reply: 'Sure, chicken biryani add chesamu. Confirm cheyyala?',
            proposedActions: [{ type: 'cart_add_plan' }],
          };
        },
      });

      const client = ioClient(`http://localhost:${port}`, {
        path: '/api/voice/stream',
        auth: { token: 'valid-token' },
        transports: ['websocket'],
      });

      const partialTranscripts: string[] = [];
      const finalTranscripts: string[] = [];
      const ttsChunks: string[] = [];
      let ttsCompleted = false;

      client.on('voice:transcript:partial', (data) => {
        partialTranscripts.push(data.transcript);
      });

      client.on('voice:transcript:final', (data) => {
        finalTranscripts.push(data.transcript);
      });

      client.on('voice:tts:chunk', (data) => {
        ttsChunks.push(Buffer.from(data.chunkBase64, 'base64').toString());
      });

      client.on('voice:tts:end', () => {
        ttsCompleted = true;
      });

      await new Promise<void>((resolve) => {
        client.on('voice:ready', () => resolve());
      });

      // Send audio chunk
      client.emit('audio:chunk', Buffer.from('pcm-audio-chunk'));

      // Simulate partial transcript from STT -> client should receive partial
      mockSttSession.emit('partial', { transcript: 'Chicken biryani', isFinal: false });

      await new Promise((r) => setTimeout(r, 10));
      assert.equal(partialTranscripts.length, 1);
      assert.equal(partialTranscripts[0], 'Chicken biryani');
      assert.equal(turnProcessed, false); // Crucial: partial does NOT process turn!

      // Simulate final transcript from STT -> triggers conversation engine + TTS streaming
      mockSttSession.emit('final', { transcript: 'Chicken biryani kavali', isFinal: true });

      await new Promise((r) => setTimeout(r, 50));

      assert.equal(finalTranscripts.length, 1);
      assert.equal(finalTranscripts[0], 'Chicken biryani kavali');
      assert.equal(turnProcessed, true);
      assert.equal(ttsChunks.length, 2);
      assert.equal(ttsChunks[0], 'tts-chunk-1');
      assert.equal(ttsChunks[1], 'tts-chunk-2');
      assert.equal(ttsCompleted, true);

      client.disconnect();
    });

    it('rejects connection when auth token is missing or invalid', async () => {
      ioServer = setupVoiceGatewayWebSocket(httpServer, {
        verifyToken: async () => null,
      });

      const client = ioClient(`http://localhost:${port}`, {
        path: '/api/voice/stream',
        auth: { token: 'invalid-token' },
        transports: ['websocket'],
      });

      const connectError = await new Promise<any>((resolve) => {
        client.on('connect_error', (err) => resolve(err));
      });

      assert.match(connectError.message, /Authentication|Invalid/);
      client.disconnect();
    });

    it('handles barge-in / cancellation during active TTS', async () => {
      let ttsAborted = false;

      const mockSttSession = new (class extends (await import('node:events')).EventEmitter {
        public isCongested() {
          return false;
        }
        public sendAudio() {}
        public endAudio() {}
        public close() {}
      })();

      const mockTtsProvider: any = {
        providerName: 'sarvam',
        generateSpeechStream: async function* (req: any, signal: AbortSignal) {
          if (signal) {
            signal.addEventListener('abort', () => {
              ttsAborted = true;
            });
          }
          yield Buffer.from('tts-chunk-1');
          await new Promise((r) => setTimeout(r, 50));
          yield Buffer.from('tts-chunk-2');
        },
      };

      ioServer = setupVoiceGatewayWebSocket(httpServer, {
        verifyToken: async () => ({ uid: 'usr_barge' }),
        sttProvider: { providerName: 'sarvam', startStreamingSession: async () => mockSttSession } as any,
        ttsProvider: mockTtsProvider,
        onTranscriptReceived: async () => ({ reply: 'Long conversational reply to be interrupted' }),
      });

      const client = ioClient(`http://localhost:${port}`, {
        path: '/api/voice/stream',
        auth: { token: 'test' },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => client.on('voice:ready', () => resolve()));

      let ttsCancelledEventReceived = false;
      const cancelledPromise = new Promise<void>((resolve) => {
        client.on('voice:tts:cancelled', () => {
          ttsCancelledEventReceived = true;
          resolve();
        });
      });

      client.on('voice:tts:start', () => {
        // As soon as TTS starts, user barges in!
        client.emit('voice:barge_in');
      });

      // Trigger turn
      mockSttSession.emit('final', { transcript: 'Interruption test', isFinal: true });

      await cancelledPromise;

      assert.equal(ttsCancelledEventReceived, true);
      assert.equal(ttsAborted, true);

      client.disconnect();
    });
  });
});
