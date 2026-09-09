/**
 * Purpose: Provider-independent contracts for Speech-to-Text (STT) and Text-to-Speech (TTS).
 * Public API: ISttProvider, ITtsProvider, SttRequest, SttResult, TtsRequest, TtsResult, VoiceProviderError
 * Dependencies: None
 * Consumers: SarvamSTTProvider, SarvamTTSProvider, OpenAiTtsProvider, VoiceGateway
 */

export type VoiceErrorCode =
  | 'STT_CONNECTION_ERROR'
  | 'STT_TIMEOUT'
  | 'STT_RATE_LIMIT'
  | 'STT_INVALID_AUDIO'
  | 'STT_AUTH_ERROR'
  | 'STT_PROVIDER_ERROR'
  | 'TTS_CONNECTION_ERROR'
  | 'TTS_TIMEOUT'
  | 'TTS_RATE_LIMIT'
  | 'TTS_AUTH_ERROR'
  | 'TTS_PROVIDER_ERROR'
  | 'VOICE_SESSION_ERROR'
  | 'VOICE_AUTH_ERROR'
  | 'VOICE_TIMEOUT'
  | 'VOICE_UNSUPPORTED';

export class VoiceProviderError extends Error {
  public readonly code: VoiceErrorCode;
  public readonly retryable: boolean;
  public readonly statusCode: number;

  constructor(params: {
    message: string;
    code: VoiceErrorCode;
    retryable?: boolean;
    statusCode?: number;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = 'VoiceProviderError';
    this.code = params.code;
    this.retryable = params.retryable ?? false;
    this.statusCode = params.statusCode ?? 500;
    if (params.cause) {
      this.cause = params.cause;
    }
  }
}

export interface SttRequest {
  readonly audioBuffer: Buffer;
  readonly mimeType?: string;
  readonly language?: string;
  readonly prompt?: string;
  readonly withDiarization?: boolean;
}

export interface SttResult {
  readonly transcript: string;
  readonly language?: string;
  readonly confidence?: number;
  readonly isFinal: boolean;
  readonly provider: string;
  readonly metadata?: Record<string, unknown>;
}

export interface SttStreamChunk {
  readonly transcript: string;
  readonly isFinal: boolean;
  readonly language?: string;
  readonly confidence?: number;
}

export interface ISttProvider {
  readonly providerName: string;
  transcribe(request: SttRequest, signal?: AbortSignal): Promise<SttResult>;
}

export interface StreamingSttOptions {
  readonly language?: string;
  readonly model?: string;
  readonly sampleRate?: number;
  readonly signal?: AbortSignal;
}

export interface IStreamingSttSession {
  sendAudio(chunk: Buffer): void;
  endAudio(): void;
  close(): void;
  isCongested(): boolean;
  on(event: 'partial', listener: (chunk: SttStreamChunk) => void): this;
  on(event: 'final', listener: (chunk: SttStreamChunk) => void): this;
  on(event: 'error', listener: (error: VoiceProviderError) => void): this;
  on(event: 'close', listener: () => void): this;
}

export interface IStreamingSttProvider {
  readonly providerName: string;
  startStreamingSession(options?: StreamingSttOptions): Promise<IStreamingSttSession>;
}

export interface TtsRequest {
  readonly text: string;
  readonly language?: string;
  readonly voiceId?: string;
  readonly pace?: number;
  readonly audioFormat?: 'mp3' | 'wav' | 'aac' | 'opus';
}

export interface TtsResult {
  readonly audioBuffer: Buffer;
  readonly contentType: string;
  readonly durationMs?: number;
  readonly provider: string;
}

export interface ITtsProvider {
  readonly providerName: string;
  generateSpeech(request: TtsRequest, signal?: AbortSignal): Promise<TtsResult>;
}

export interface IStreamingTtsProvider {
  readonly providerName: string;
  generateSpeechStream(request: TtsRequest, signal?: AbortSignal): AsyncIterable<Buffer>;
}
