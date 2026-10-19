/**
 * Purpose: Realtime Voice Client for BhojanOS Owner Assistant (/api/voice/stream).
 * Channel: bhojanos_owner | Mode: merchant_ops
 * Capabilities:
 * - Establishes authorized WebSocket to backend voice gateway.
 * - Passes owner auth token and active tenantId.
 * - Streams mic audio or text utterances.
 * - Receives authoritative sales summaries, kitchen pending orders, and proposal-only stock actions.
 */

import { io, type Socket } from 'socket.io-client';

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
  readonly onTtsEnd?: (data?: { turnId?: string }) => void;
  readonly onTtsCancelled?: (data?: { turnId?: string }) => void;
  readonly onError?: (err: { code: string; message: string }) => void;
}

export interface OwnerVoiceClientOptions {
  readonly baseUrl?: string;
  readonly tenantId: string;
  readonly getToken: () => Promise<string | null>;
  readonly language?: string;
}

export class OwnerVoiceClient {
  private socket: Socket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isRecording = false;

  constructor(
    private readonly options: OwnerVoiceClientOptions,
    private readonly events: OwnerVoiceEvents,
  ) {}

  public async connect(): Promise<boolean> {
    const token = (await this.options.getToken()) || 'guest';
    const baseUrl = this.options.baseUrl || window.location.origin;

    return new Promise<boolean>((resolve) => {
      try {
        this.socket = io(baseUrl, {
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

        this.socket.on('connect', () => {
          // Connected to voice stream
        });

        this.socket.on('voice:ready', (data) => {
          this.events.onReady?.(data);
          resolve(true);
        });

        this.socket.on('voice:transcript:partial', (data) => {
          this.events.onPartialTranscript?.(data);
        });

        this.socket.on('voice:transcript:final', (data) => {
          this.events.onFinalTranscript?.(data);
        });

        this.socket.on('voice:turn:result', (data) => {
          this.events.onTurnResult?.(data);
        });

        this.socket.on('voice:tts:start', (data) => {
          this.events.onTtsStart?.(data);
        });

        this.socket.on('voice:tts:chunk', (data) => {
          this.events.onTtsChunk?.(data);
        });

        this.socket.on('voice:tts:end', (data) => {
          this.events.onTtsEnd?.(data);
        });

        this.socket.on('voice:tts:cancelled', (data) => {
          this.events.onTtsCancelled?.(data);
        });

        this.socket.on('voice:error', (err) => {
          this.events.onError?.(err);
        });

        this.socket.on('connect_error', (err) => {
          this.events.onError?.({ code: 'CONNECT_ERROR', message: err.message });
          resolve(false);
        });
      } catch (err: any) {
        this.events.onError?.({ code: 'INIT_ERROR', message: err?.message || 'Connection failed' });
        resolve(false);
      }
    });
  }

  public async startMicrophoneCapture(): Promise<boolean> {
    if (this.isRecording) return true;
    try {
      if (!this.audioContext) {
        const AudioContextClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioContextClass();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(() => {});
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isRecording || !this.socket?.connected) return;
        const inputData = e.inputBuffer.getChannelData(0);
        // Simple linear PCM conversion for streaming
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        this.socket.emit('voice:audio:chunk', pcm16.buffer);
      };

      source.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);
      this.isRecording = true;
      return true;
    } catch (err: any) {
      this.events.onError?.({ code: 'MIC_PERMISSION_DENIED', message: err?.message || 'Mic access denied' });
      return false;
    }
  }

  public stopMicrophoneCapture(): void {
    this.isRecording = false;
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
  }

  public stopSpeaking(): void {
    if (this.socket?.connected) {
      this.socket.emit('voice:stop');
    }
  }

  public disconnect(): void {
    this.stopMicrophoneCapture();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}
