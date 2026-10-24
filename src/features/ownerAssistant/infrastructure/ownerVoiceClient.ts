/**
 * Purpose: Realtime Voice Client for BhojanOS Owner Assistant (/api/voice/stream).
 * Channel: bhojanos_owner | Mode: merchant_ops
 * Capabilities:
 * - Establishes authorized WebSocket to backend voice gateway (Render backend, not Vercel static origin).
 * - Passes owner auth token and active tenantId.
 * - Streams mic audio or text utterances.
 * - Synchronous user-gesture audio acquisition for WebKit/Safari compatibility.
 * - Progressive streaming TTS playback via Web Audio API.
 * - Receives authoritative sales summaries, kitchen pending orders, and proposal-only stock actions.
 */

import { io, type Socket } from 'socket.io-client';
import { EnvironmentConfig } from '../../../config/environment';

export type OwnerVoiceClientState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

export interface OwnerVoiceError {
  readonly code:
    | 'CONNECT_ERROR'
    | 'CONNECT_TIMEOUT'
    | 'AUTH_FAILED'
    | 'MIC_PERMISSION_DENIED'
    | 'MIC_NOT_FOUND'
    | 'MIC_IN_USE'
    | 'MIC_INSECURE_CONTEXT'
    | 'MIC_UNSUPPORTED'
    | 'MIC_GESTURE_REQUIRED'
    | 'MIC_CAPTURE_FAILED'
    | 'AUDIO_PLAYBACK_BLOCKED'
    | 'TURN_ERROR'
    | 'UNKNOWN_ERROR';
  readonly message: string;
  readonly userGuidance?: string;
  readonly retryable?: boolean;
  readonly rawError?: unknown;
}

export interface OwnerVoiceEvents {
  readonly onReady?: (info: { sessionId: string; provider: string; streaming: boolean }) => void;
  readonly onPartialTranscript?: (data: { transcript: string; language?: string; isFinal?: boolean }) => void;
  readonly onFinalTranscript?: (data: { transcript: string; language?: string; isFinal?: boolean }) => void;
  readonly onTurnResult?: (data: {
    reply: string;
    proposedActions?: Array<{ type: string; payload: Record<string, any> }>;
    intent?: string;
    language?: string;
    correlationId?: string;
    latencyMs?: number;
    authorized?: boolean;
  }) => void;
  readonly onTtsStart?: (data?: { turnId?: string }) => void;
  readonly onTtsChunk?: (data: { chunkBase64: string; index: number; turnId?: string }) => void;
  readonly onTtsEnd?: (data?: { turnId?: string; totalChunks?: number }) => void;
  readonly onTtsCancelled?: (data?: { turnId?: string }) => void;
  readonly onError?: (err: OwnerVoiceError) => void;
  readonly onStateChange?: (state: OwnerVoiceClientState) => void;
}

export interface OwnerVoiceClientOptions {
  readonly baseUrl?: string;
  readonly tenantId: string;
  readonly getToken: () => Promise<string | null>;
  readonly language?: string;
}

export function isOwnerVoiceCaptureAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const hasAudioContext = Boolean(
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext,
  );
  const hasMediaDevices = Boolean(navigator?.mediaDevices?.getUserMedia);
  return hasAudioContext && hasMediaDevices;
}

export class OwnerVoiceClient {
  private socket: Socket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioInputNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private currentTtsSource: AudioBufferSourceNode | null = null;
  private ttsPlayScheduledTime = 0;
  private isRecording = false;
  private isSpeaking = false;
  private connectPromise: Promise<boolean> | null = null;
  private state: OwnerVoiceClientState = 'disconnected';

  constructor(
    private readonly options: OwnerVoiceClientOptions,
    private readonly events: OwnerVoiceEvents,
  ) {}

  public getState(): OwnerVoiceClientState {
    return this.state;
  }

  private setState(newState: OwnerVoiceClientState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.events.onStateChange?.(newState);
  }

  private handleError(err: OwnerVoiceError): void {
    this.setState('error');
    this.events.onError?.(err);
  }

  /**
   * Resolves the authoritative backend WebSocket Gateway origin.
   * Under no circumstances connects to static frontend origins (bhojanos.com / vercel.app)
   * which return HTTP 404 for WebSocket upgrades.
   */
  public resolveGatewayUrl(): string {
    if (this.options.baseUrl) {
      return this.options.baseUrl.replace(/\/$/, '');
    }

    try {
      const apiUrl = EnvironmentConfig.getApiUrl();
      if (apiUrl) {
        return apiUrl.replace(/\/$/, '');
      }
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname.toLowerCase();
      if (
        hostname === 'bhojanos.com' ||
        hostname === 'www.bhojanos.com' ||
        hostname.includes('vercel.app') ||
        hostname.includes('web.app') ||
        hostname.includes('firebaseapp.com')
      ) {
        return 'https://manaintibojanam-backend.onrender.com';
      }
      return window.location.origin;
    }

    return 'https://manaintibojanam-backend.onrender.com';
  }

  public async connect(): Promise<boolean> {
    if (this.socket?.connected) {
      this.setState('connected');
      return true;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.setState('connecting');
    const token = (await this.options.getToken().catch(() => null)) || 'guest';
    const baseUrl = this.resolveGatewayUrl();

    this.connectPromise = new Promise<boolean>((resolve) => {
      try {
        const socket = io(baseUrl, {
          path: '/api/voice/stream',
          auth: { token },
          query: {
            tenantId: this.options.tenantId,
            mode: 'merchant_ops',
            channel: 'bhojanos_owner',
            lang: this.options.language || 'te-IN',
          },
          transports: ['websocket', 'polling'],
          timeout: 8000,
          reconnection: true,
          reconnectionAttempts: 3,
        });

        this.socket = socket;

        socket.on('connect', () => {
          this.setState('connected');
        });

        socket.on('voice:ready', (data) => {
          this.events.onReady?.(data);
          this.setState('connected');
          resolve(true);
        });

        socket.on('voice:transcript:partial', (data) => {
          this.events.onPartialTranscript?.(data);
          this.setState('listening');
        });

        socket.on('voice:transcript:final', (data) => {
          this.events.onFinalTranscript?.(data);
          if (data.transcript?.trim()) {
            this.setState('processing');
          }
        });

        socket.on('voice:turn:result', (data) => {
          this.events.onTurnResult?.(data);
          this.setState('connected');
        });

        socket.on('voice:tts:start', (data) => {
          this.isSpeaking = true;
          this.ttsPlayScheduledTime = 0;
          this.setState('speaking');
          this.events.onTtsStart?.(data);
        });

        socket.on('voice:tts:chunk', async (data) => {
          this.events.onTtsChunk?.(data);
          if (data?.chunkBase64) {
            await this.playTtsChunk(data.chunkBase64);
          }
        });

        socket.on('voice:tts:end', (data) => {
          this.events.onTtsEnd?.(data);
        });

        socket.on('voice:tts:cancelled', (data) => {
          this.stopTtsPlayback();
          this.events.onTtsCancelled?.(data);
          if (this.state === 'speaking') {
            this.setState('connected');
          }
        });

        socket.on('voice:error', (err) => {
          this.handleError({
            code: 'TURN_ERROR',
            message: err?.message || 'Voice assistant turn error',
            userGuidance: 'The assistant could not complete that query. Try rephrasing or use text.',
            retryable: true,
            rawError: err,
          });
        });

        socket.on('connect_error', (err) => {
          this.handleError({
            code: 'CONNECT_ERROR',
            message: err?.message || 'Failed to connect to voice gateway',
            userGuidance:
              'Voice gateway unreachable. Please verify your internet connection or tap reconnect.',
            retryable: true,
            rawError: err,
          });
          resolve(false);
        });

        socket.on('disconnect', (reason) => {
          this.stopMicrophoneCapture();
          this.stopTtsPlayback();
          if (reason !== 'io client disconnect') {
            this.setState('disconnected');
          }
        });
      } catch (err: any) {
        this.handleError({
          code: 'CONNECT_ERROR',
          message: err?.message || 'Connection initialization failed',
          userGuidance: 'Unable to initialize voice connection. Tap retry.',
          retryable: true,
          rawError: err,
        });
        resolve(false);
      }
    }).finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  /**
   * Starts microphone capture with strict synchronous user-gesture compliance.
   * In WebKit/Safari on iOS, navigator.mediaDevices.getUserMedia MUST be called
   * directly in the synchronous event call stack without any preceding await/microtask.
   */
  public async startMicrophoneCapture(): Promise<boolean> {
    if (this.isRecording) return true;

    if (typeof window === 'undefined') return false;

    // Feature & secure-context pre-flight checks
    if (
      window.isSecureContext === false &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      this.handleError({
        code: 'MIC_INSECURE_CONTEXT',
        message: 'Microphone requires HTTPS',
        userGuidance: 'Open BhojanOS over a secure HTTPS connection to use voice features.',
        retryable: false,
      });
      return false;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      this.handleError({
        code: 'MIC_UNSUPPORTED',
        message: 'Microphone is not supported in this browser',
        userGuidance:
          'Your current browser does not support audio recording. Try opening BhojanOS in Chrome or Safari.',
        retryable: false,
      });
      return false;
    }

    // Halt assistant TTS if currently speaking (barge-in)
    if (this.isSpeaking) {
      this.bargeIn();
    }

    // CRITICAL: Call getUserMedia synchronously in user gesture call-stack BEFORE any await
    let streamPromise: Promise<MediaStream>;
    try {
      streamPromise = navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (syncErr: any) {
      this.classifyAndEmitMicError(syncErr);
      return false;
    }

    // Await user permission prompt result
    try {
      this.mediaStream = await streamPromise;
    } catch (asyncErr: any) {
      this.classifyAndEmitMicError(asyncErr);
      return false;
    }

    // Build audio processing pipeline after mediaStream is acquired
    try {
      if (!this.audioContext) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('AudioContext unavailable');
        }
        this.audioContext = new AudioContextClass();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(() => {});
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!this.isRecording || !this.socket?.connected) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = this.floatTo16BitPCM(inputData);
        // Correct backend event: 'audio:chunk' matching voiceGatewayWs.ts:318
        this.socket.emit('audio:chunk', pcm16);
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      this.audioInputNode = source;
      this.processorNode = processor;
      this.isRecording = true;
      this.setState('listening');
      return true;
    } catch (procErr: any) {
      this.handleError({
        code: 'MIC_CAPTURE_FAILED',
        message: procErr?.message || 'Failed to initialize audio capture pipeline',
        userGuidance: 'Audio pipeline initialization failed. Tap retry or use text input.',
        retryable: true,
        rawError: procErr,
      });
      this.stopMicrophoneCapture();
      return false;
    }
  }

  public classifyAndEmitMicError(err: any): void {
    const errorName = err?.name || '';
    const errorMsg = err?.message || '';

    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      this.handleError({
        code: 'MIC_PERMISSION_DENIED',
        message: 'Microphone permission denied',
        userGuidance:
          'Microphone access was blocked. Tap the 🔒 or AA icon in your browser address bar → Website Settings → Allow Microphone, then tap Retry.',
        retryable: true,
        rawError: err,
      });
      return;
    }

    if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
      this.handleError({
        code: 'MIC_NOT_FOUND',
        message: 'No microphone found',
        userGuidance: 'No input microphone was detected on this device. Connect a microphone or headset and try again.',
        retryable: true,
        rawError: err,
      });
      return;
    }

    if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
      this.handleError({
        code: 'MIC_IN_USE',
        message: 'Microphone in use by another app',
        userGuidance: 'Another app or tab is using your microphone. Close other audio apps and try again.',
        retryable: true,
        rawError: err,
      });
      return;
    }

    if (errorName === 'SecurityError') {
      this.handleError({
        code: 'MIC_INSECURE_CONTEXT',
        message: 'Microphone permission blocked by security policy',
        userGuidance: 'Microphone access is restricted by your browser security policy or iframe settings.',
        retryable: false,
        rawError: err,
      });
      return;
    }

    this.handleError({
      code: 'UNKNOWN_ERROR',
      message: errorMsg || 'Microphone capture failed',
      userGuidance: 'An unexpected microphone error occurred. Tap Retry or use text query below.',
      retryable: true,
      rawError: err,
    });
  }

  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const output = new DataView(new ArrayBuffer(input.length * 2));
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return output.buffer;
  }

  public stopMicrophoneCapture(): void {
    if (!this.isRecording) return;
    this.isRecording = false;

    if (this.socket?.connected) {
      this.socket.emit('audio:end');
    }

    if (this.processorNode) {
      try {
        this.processorNode.disconnect?.();
      } catch {
        // ignore
      }
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.audioInputNode) {
      try {
        this.audioInputNode.disconnect?.();
      } catch {
        // ignore
      }
      this.audioInputNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => {
        try {
          t.stop?.();
        } catch {
          // ignore
        }
      });
      this.mediaStream = null;
    }

    if (this.state === 'listening') {
      this.setState(this.socket?.connected ? 'connected' : 'disconnected');
    }
  }

  public sendText(transcript: string, language?: string): boolean {
    const cleanText = transcript.trim();
    if (!cleanText || !this.socket?.connected) return false;

    if (this.isRecording) {
      this.stopMicrophoneCapture();
    }
    if (this.isSpeaking) {
      this.bargeIn();
    }

    this.setState('processing');
    this.socket.emit('voice:turn', {
      transcript: cleanText,
      language: language || this.options.language || 'te-IN',
      context: {
        tenantId: this.options.tenantId,
        mode: 'merchant_ops',
        channel: 'bhojanos_owner',
      },
    });
    return true;
  }

  public bargeIn(): void {
    this.stopTtsPlayback();
    if (this.socket?.connected) {
      this.socket.emit('voice:barge_in');
    }
  }

  public stopSpeaking(): void {
    this.stopTtsPlayback();
    if (this.socket?.connected) {
      this.socket.emit('voice:cancel');
    }
    if (this.state === 'speaking') {
      this.setState('connected');
    }
  }

  private stopTtsPlayback(): void {
    this.isSpeaking = false;
    if (this.currentTtsSource) {
      try {
        this.currentTtsSource.stop();
        this.currentTtsSource.disconnect();
      } catch {
        // ignore
      }
      this.currentTtsSource = null;
    }
    this.ttsPlayScheduledTime = 0;
  }

  private async playTtsChunk(chunkBase64: string): Promise<void> {
    if (!chunkBase64) return;

    try {
      if (!this.audioContext) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        this.audioContext = new AudioContextClass();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(() => {});
      }

      const binaryStr = atob(chunkBase64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);
      this.scheduleAudioChunk(audioBuffer);
    } catch {
      // Chunk decode or playback fallback
    }
  }

  private scheduleAudioChunk(buffer: AudioBuffer): void {
    if (!this.audioContext) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    const startTime = Math.max(currentTime, this.ttsPlayScheduledTime);
    source.start(startTime);

    this.ttsPlayScheduledTime = startTime + buffer.duration;
    this.currentTtsSource = source;

    source.onended = () => {
      if (this.currentTtsSource === source) {
        this.currentTtsSource = null;
      }
      if (this.audioContext && this.audioContext.currentTime >= this.ttsPlayScheduledTime - 0.05) {
        this.isSpeaking = false;
        if (this.state === 'speaking') {
          this.setState('connected');
        }
      }
    };
  }

  public disconnect(): void {
    this.stopMicrophoneCapture();
    this.stopTtsPlayback();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.setState('disconnected');
  }
}
