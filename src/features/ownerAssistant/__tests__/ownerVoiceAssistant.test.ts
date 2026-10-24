import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  OwnerVoiceClient,
  isOwnerVoiceCaptureAvailable,
  type OwnerVoiceError,
  type OwnerVoiceClientState,
} from '../infrastructure/ownerVoiceClient.js';

describe('BhojanOS Owner Voice Assistant — Client & Reliability Tests', () => {
  const originalWindow = (globalThis as any).window;
  const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  const setMockNavigator = (nav: any) => {
    Object.defineProperty(globalThis, 'navigator', {
      value: nav,
      configurable: true,
      writable: true,
    });
  };

  const setMockWindow = (win: any) => {
    Object.defineProperty(globalThis, 'window', {
      value: win,
      configurable: true,
      writable: true,
    });
  };

  beforeEach(() => {
    // defaults
  });

  afterEach(() => {
    setMockWindow(originalWindow);
    if (originalNavigatorDesc) {
      Object.defineProperty(globalThis, 'navigator', originalNavigatorDesc);
    }
  });

  describe('1. WebSocket Gateway Origin Resolution', () => {
    it('uses explicitly passed baseUrl if provided', () => {
      const client = new OwnerVoiceClient(
        {
          baseUrl: 'https://custom-gateway.internal:8080',
          tenantId: 'test-tenant',
          getToken: async () => 'mock-token',
        },
        {},
      );

      assert.equal(client.resolveGatewayUrl(), 'https://custom-gateway.internal:8080');
    });

    it('resolves to Render backend on production bhojanos.com instead of static Vercel origin', () => {
      setMockWindow({
        location: {
          origin: 'https://bhojanos.com',
          hostname: 'bhojanos.com',
        },
        isSecureContext: true,
      });

      const client = new OwnerVoiceClient(
        {
          tenantId: 'inti-bojanam-ghar-kha-khana-pune',
          getToken: async () => 'mock-token',
        },
        {},
      );

      const resolved = client.resolveGatewayUrl();
      assert.notEqual(resolved, 'https://bhojanos.com');
      assert.equal(resolved, 'https://manaintibojanam-backend.onrender.com');
    });

    it('resolves to Render backend on www.bhojanos.com and vercel preview domains', () => {
      setMockWindow({
        location: {
          origin: 'https://www.bhojanos.com',
          hostname: 'www.bhojanos.com',
        },
        isSecureContext: true,
      });

      const client = new OwnerVoiceClient(
        {
          tenantId: 'test-tenant',
          getToken: async () => 'mock-token',
        },
        {},
      );

      assert.equal(client.resolveGatewayUrl(), 'https://manaintibojanam-backend.onrender.com');

      (globalThis as any).window.location.hostname = 'bhojanos-preview.vercel.app';
      assert.equal(client.resolveGatewayUrl(), 'https://manaintibojanam-backend.onrender.com');
    });
  });

  describe('2. Browser Permissions & Audio Capability Detection', () => {
    it('reports voice unavailable when mediaDevices is missing', () => {
      setMockWindow({});
      setMockNavigator({});

      assert.equal(isOwnerVoiceCaptureAvailable(), false);
    });

    it('reports voice available when AudioContext and getUserMedia are present', () => {
      setMockWindow({
        AudioContext: class MockAudioContext {},
      });
      setMockNavigator({
        mediaDevices: {
          getUserMedia: async () => ({}) as any,
        },
      });

      assert.equal(isOwnerVoiceCaptureAvailable(), true);
    });

    it('classifies NotAllowedError as MIC_PERMISSION_DENIED with actionable browser instructions', () => {
      let emittedError: OwnerVoiceError | null = null;
      const client = new OwnerVoiceClient(
        {
          tenantId: 'test-tenant',
          getToken: async () => 'mock-token',
        },
        {
          onError: (err) => {
            emittedError = err;
          },
        },
      );

      const notAllowedErr = new Error(
        'The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.',
      );
      (notAllowedErr as any).name = 'NotAllowedError';

      client.classifyAndEmitMicError(notAllowedErr);

      assert.ok(emittedError);
      assert.equal(emittedError.code, 'MIC_PERMISSION_DENIED');
      assert.equal(emittedError.retryable, true);
      assert.match(emittedError.userGuidance || '', /Tap the 🔒 or AA icon/);
      assert.match(emittedError.userGuidance || '', /Allow Microphone/);
    });

    it('classifies NotFoundError as MIC_NOT_FOUND', () => {
      let emittedError: OwnerVoiceError | null = null;
      const client = new OwnerVoiceClient(
        {
          tenantId: 'test-tenant',
          getToken: async () => 'mock-token',
        },
        {
          onError: (err) => {
            emittedError = err;
          },
        },
      );

      const notFoundErr = new Error('Requested device not found');
      (notFoundErr as any).name = 'NotFoundError';

      client.classifyAndEmitMicError(notFoundErr);

      assert.ok(emittedError);
      assert.equal(emittedError.code, 'MIC_NOT_FOUND');
      assert.match(emittedError.userGuidance || '', /No input microphone was detected/);
    });

    it('classifies NotReadableError as MIC_IN_USE', () => {
      let emittedError: OwnerVoiceError | null = null;
      const client = new OwnerVoiceClient(
        {
          tenantId: 'test-tenant',
          getToken: async () => 'mock-token',
        },
        {
          onError: (err) => {
            emittedError = err;
          },
        },
      );

      const notReadableErr = new Error('Could not start audio source');
      (notReadableErr as any).name = 'NotReadableError';

      client.classifyAndEmitMicError(notReadableErr);

      assert.ok(emittedError);
      assert.equal(emittedError.code, 'MIC_IN_USE');
      assert.match(emittedError.userGuidance || '', /Another app or tab is using your microphone/);
    });

    it('rejects un-secure contexts with MIC_INSECURE_CONTEXT', async () => {
      setMockWindow({
        isSecureContext: false,
        location: {
          origin: 'http://insecure-bhojan.example',
          hostname: 'insecure-bhojan.example',
        },
      });
      setMockNavigator({
        mediaDevices: {
          getUserMedia: async () => ({}) as any,
        },
      });

      let emittedError: OwnerVoiceError | null = null;
      const client = new OwnerVoiceClient(
        {
          tenantId: 'test-tenant',
          getToken: async () => 'mock-token',
        },
        {
          onError: (err) => {
            emittedError = err;
          },
        },
      );

      const ok = await client.startMicrophoneCapture();
      assert.equal(ok, false);
      assert.ok(emittedError);
      assert.equal(emittedError.code, 'MIC_INSECURE_CONTEXT');
      assert.equal(emittedError.retryable, false);
    });
  });

  describe('3. Synchronous User Gesture Execution', () => {
    it('invokes navigator.mediaDevices.getUserMedia synchronously in call stack', async () => {
      let getUserMediaCalledSync = false;
      const mockStream = {
        getTracks: () => [{ stop: () => {} }],
      };

      setMockWindow({
        isSecureContext: true,
        location: { origin: 'https://bhojanos.com', hostname: 'bhojanos.com' },
        AudioContext: class {
          state = 'running';
          createMediaStreamSource() {
            return { connect() {} };
          }
          createScriptProcessor() {
            return { connect() {}, disconnect() {} };
          }
          destination = {};
        },
      });

      setMockNavigator({
        mediaDevices: {
          getUserMedia: () => {
            getUserMediaCalledSync = true;
            return Promise.resolve(mockStream as any);
          },
        },
      });

      const client = new OwnerVoiceClient(
        {
          tenantId: 'test-tenant',
          getToken: async () => 'mock-token',
        },
        {},
      );

      const startPromise = client.startMicrophoneCapture();
      // getUserMedia must be called synchronously BEFORE startPromise resolves
      assert.equal(getUserMediaCalledSync, true);

      const result = await startPromise;
      assert.equal(result, true);
      assert.equal(client.getState(), 'listening');

      client.stopMicrophoneCapture();
      assert.equal(client.getState(), 'disconnected');
    });
  });

  describe('4. WebSocket Event Contracts & Text Fallback', () => {
    it('emits audio:chunk matching backend voiceGatewayWs listener', () => {
      const emittedEvents: Array<{ event: string; data: any }> = [];
      const mockSocket = {
        connected: true,
        emit: (event: string, data: any) => {
          emittedEvents.push({ event, data });
        },
        disconnect: () => {},
      };

      const client = new OwnerVoiceClient(
        {
          tenantId: 'test-tenant',
          getToken: async () => 'mock-token',
        },
        {},
      );

      (client as any).socket = mockSocket;
      (client as any).isRecording = true;

      // Stop mic emits 'audio:end'
      client.stopMicrophoneCapture();
      assert.ok(emittedEvents.some((e) => e.event === 'audio:end'));
    });

    it('sendText emits voice:turn with tenant and channel metadata', () => {
      const emittedEvents: Array<{ event: string; data: any }> = [];
      const mockSocket = {
        connected: true,
        emit: (event: string, data: any) => {
          emittedEvents.push({ event, data });
        },
        disconnect: () => {},
      };

      const client = new OwnerVoiceClient(
        {
          tenantId: 'inti-bojanam-ghar-kha-khana-pune',
          getToken: async () => 'mock-token',
          language: 'te-IN',
        },
        {},
      );

      (client as any).socket = mockSocket;

      const sent = client.sendText('ఈరోజు సేల్స్ ఎంత?');
      assert.equal(sent, true);

      const turnEvent = emittedEvents.find((e) => e.event === 'voice:turn');
      assert.ok(turnEvent);
      assert.equal(turnEvent.data.transcript, 'ఈరోజు సేల్స్ ఎంత?');
      assert.equal(turnEvent.data.language, 'te-IN');
      assert.equal(turnEvent.data.context.tenantId, 'inti-bojanam-ghar-kha-khana-pune');
      assert.equal(turnEvent.data.context.channel, 'bhojanos_owner');
      assert.equal(turnEvent.data.context.mode, 'merchant_ops');
      assert.equal(client.getState(), 'processing');
    });

    it('bargeIn and stopSpeaking emit voice:barge_in and voice:cancel', () => {
      const emittedEvents: Array<{ event: string; data: any }> = [];
      const mockSocket = {
        connected: true,
        emit: (event: string, data: any) => {
          emittedEvents.push({ event, data });
        },
        disconnect: () => {},
      };

      const client = new OwnerVoiceClient(
        {
          tenantId: 'test-tenant',
          getToken: async () => 'mock-token',
        },
        {},
      );

      (client as any).socket = mockSocket;

      client.bargeIn();
      assert.ok(emittedEvents.some((e) => e.event === 'voice:barge_in'));

      client.stopSpeaking();
      assert.ok(emittedEvents.some((e) => e.event === 'voice:cancel'));
    });
  });

  describe('5. State Machine Lifecycle Transitions', () => {
    it('notifies onStateChange across the session lifecycle', () => {
      const states: OwnerVoiceClientState[] = [];
      const client = new OwnerVoiceClient(
        {
          tenantId: 'test-tenant',
          getToken: async () => 'mock-token',
        },
        {
          onStateChange: (state) => {
            states.push(state);
          },
        },
      );

      assert.equal(client.getState(), 'disconnected');

      (client as any).setState('connecting');
      (client as any).setState('connected');
      (client as any).setState('listening');
      (client as any).setState('processing');
      (client as any).setState('speaking');
      (client as any).setState('connected');

      assert.deepEqual(states, [
        'connecting',
        'connected',
        'listening',
        'processing',
        'speaking',
        'connected',
      ]);
    });
  });
});
