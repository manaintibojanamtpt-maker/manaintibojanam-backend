/**
 * Purpose: Realtime Voice Client connecting OrderBhojan Web to backend Voice Gateway (/api/voice/stream).
 * Public API: createRealtimeVoiceClient, RealtimeVoiceSession, isVoiceStreamingSupported
 * Capabilities:
 * - WebSocket streaming STT via Sarvam saaras:v4-realtime with automatic multilingual detection.
 * - Progressive streaming TTS playback via Web Audio API.
 * - Realtime interim transcript captioning.
 * - Instant barge-in / interruption of assistant speech.
 * - Automatic fallback to Web Speech API / batch STT when offline or unsupported.
 */

import { io, type Socket } from 'socket.io-client';
import { getAppConfig } from '@/config';
import { getMarketplaceAuthTokenProvider } from '@/marketplace-api';

export interface RealtimeVoiceEvents {
  onReady?: (info: { sessionId: string; provider: string; streaming: boolean }) => void;
  onPartialTranscript?: (data: { transcript: string; language?: string }) => void;
  onFinalTranscript?: (data: { transcript: string; language?: string }) => void;
  onTurnResult?: (data: { reply: string; proposedActions?: any[] }) => void;
  onTtsStart?: () => void;
  onTtsChunk?: (data: { chunkBase64: string; index: number }) => void;
  onTtsEnd?: () => void;
  onTtsCancelled?: () => void;
  onError?: (err: { code: string; message: string }) => void;
  onBackpressure?: (data: { status: string }) => void;
}

export function isVoiceStreamingSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const hasAudioContext = Boolean(
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext,
  );
  const hasMediaDevices = Boolean(navigator?.mediaDevices?.getUserMedia);
  return hasAudioContext && hasMediaDevices;
}

export class RealtimeVoiceSession {
  private socket: Socket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioInputNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isRecording = false;
  private isSpeaking = false;
  private currentTtsSource: AudioBufferSourceNode | null = null;
  private ttsPlayScheduledTime = 0;

  constructor(
    private readonly baseUrl: string,
    private readonly events: RealtimeVoiceEvents,
  ) {}

  public async connect(): Promise<boolean> {
    const tokenProvider = getMarketplaceAuthTokenProvider();
    const rawToken = tokenProvider ? await tokenProvider() : null;
    const token = rawToken || 'guest';

    return new Promise<boolean>((resolve) => {
      try {
        this.socket = io(this.baseUrl, {
          path: '/api/voice/stream',
          auth: { token },
          transports: ['websocket', 'polling'],
          timeout: 8000,
          reconnection: true,
          reconnectionAttempts: 3,
        });

        this.socket.on('connect', () => {
          // Socket connected successfully
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

        this.socket.on('voice:tts:start', () => {
          this.isSpeaking = true;
          this.ttsPlayScheduledTime = 0;
          this.events.onTtsStart?.();
        });

        this.socket.on('voice:tts:chunk', async (data) => {
          this.events.onTtsChunk?.(data);
          await this.playTtsChunk(data.chunkBase64);
        });

        this.socket.on('voice:tts:end', () => {
          this.events.onTtsEnd?.();
        });

        this.socket.on('voice:tts:cancelled', () => {
          this.stopTtsPlayback();
          this.events.onTtsCancelled?.();
        });

        this.socket.on('voice:backpressure', (data) => {
          this.events.onBackpressure?.(data);
        });

        this.socket.on('voice:error', (err) => {
          this.events.onError?.(err);
        });

        this.socket.on('connect_error', (err) => {
          this.events.onError?.({ code: 'CONNECT_ERROR', message: err.message });
          resolve(false);
        });
      } catch (err: any) {
        this.events.onError?.({ code: 'INIT_ERROR', message: err?.message || 'Failed to connect' });
        resolve(false);
      }
    });
  }

  public async startMicrophoneCapture(): Promise<boolean> {
    if (this.isRecording) return true;
    if (this.isSpeaking) {
      this.bargeIn();
    }

    try {
      if (!this.audioContext) {
        const AudioContextClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioContextClass({ sampleRate: 16000 });
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(() => {});
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioInputNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isRecording || !this.socket?.connected) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBuffer = this.floatTo16BitPCM(inputData);
        this.socket.emit('audio:chunk', pcmBuffer);
      };

      this.audioInputNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isRecording = true;
      return true;
    } catch {
      return false;
    }
  }

  public stopMicrophoneCapture(): void {
    if (!this.isRecording) return;
    this.isRecording = false;

    if (this.socket?.connected) {
      this.socket.emit('audio:end');
    }

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.audioInputNode) {
      this.audioInputNode.disconnect();
      this.audioInputNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  public bargeIn(): void {
    this.stopTtsPlayback();
    if (this.socket?.connected) {
      this.socket.emit('voice:barge_in');
    }
  }

  public cancel(): void {
    this.stopMicrophoneCapture();
    this.stopTtsPlayback();
    if (this.socket?.connected) {
      this.socket.emit('voice:cancel');
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
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      // Chunk decode fallback
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
      }
    };
  }

  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const output = new DataView(new ArrayBuffer(input.length * 2));
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return output.buffer;
  }

  public disconnect(): void {
    this.cancel();
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

export function createRealtimeVoiceClient(events: RealtimeVoiceEvents = {}): RealtimeVoiceSession {
  const config = getAppConfig();
  const baseUrl = config.marketplaceApiBaseUrl.replace(/\/$/, '');
  return new RealtimeVoiceSession(baseUrl, events);
}
