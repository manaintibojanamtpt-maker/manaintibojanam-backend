/**
 * Purpose: Sarvam AI Realtime Streaming Speech-to-Text (STT) implementation.
 * Public API: SarvamStreamingSttProvider, SarvamStreamingSttSession
 * Dependencies: IStreamingSttProvider, IStreamingSttSession, SttStreamChunk, VoiceProviderError
 */

import { EventEmitter } from 'node:events';
import type {
  IStreamingSttProvider,
  IStreamingSttSession,
  StreamingSttOptions,
  SttStreamChunk,
} from './types.js';
import { VoiceProviderError } from './types.js';
import { normalizeStreamingSttModel } from '../voiceConfig.js';

export interface SarvamStreamingSttOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly defaultLanguage?: string;
  readonly maxBufferedBytes?: number;
  readonly maxReconnectRetries?: number;
  readonly reconnectBaseDelayMs?: number;
}

const DEFAULT_MAX_BUFFERED_BYTES = 128 * 1024; // 128 KB
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 250;

export class SarvamStreamingSttSession extends EventEmitter implements IStreamingSttSession {
  private ws: any = null;
  private isExplicitlyClosed = false;
  private isConnected = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly pendingBufferQueue: Buffer[] = [];
  private totalQueuedBytes = 0;
  private readonly maxQueueBytes = 2 * 1024 * 1024; // 2MB max queue in memory

  constructor(
    private readonly apiKey: string,
    private readonly wsUrl: string,
    private readonly options: {
      maxBufferedBytes: number;
      maxReconnectRetries: number;
      reconnectBaseDelayMs: number;
      signal?: AbortSignal;
    },
  ) {
    super();

    if (this.options.signal) {
      if (this.options.signal.aborted) {
        this.close();
      } else {
        this.options.signal.addEventListener('abort', () => this.close(), { once: true });
      }
    }

    this.connect();
  }

  private connect(): void {
    if (this.isExplicitlyClosed) return;

    try {
      const WebSocketImpl = (globalThis as any).WebSocket;
      if (!WebSocketImpl) {
        this.emit(
          'error',
          new VoiceProviderError({
            message: 'WebSocket implementation is unavailable in runtime',
            code: 'STT_CONNECTION_ERROR',
            statusCode: 500,
          }),
        );
        return;
      }

      this.ws = new WebSocketImpl(this.wsUrl, {
        headers: {
          'api-subscription-key': this.apiKey,
        },
      });

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.flushPendingBuffer();
      };

      this.ws.onmessage = (event: any) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : event.data?.toString('utf8');
          if (!raw) return;
          const data = JSON.parse(raw);

          // Support Sarvam realtime payload structures
          const transcript = data.transcript ?? data.text ?? data.data?.transcript ?? '';
          const isFinal = Boolean(data.is_final ?? data.type === 'final' ?? data.event === 'transcript.final');
          const language = data.language_code ?? data.language;
          const confidence = typeof data.confidence === 'number' ? data.confidence : undefined;

          if (typeof transcript === 'string' && transcript.trim().length > 0) {
            const chunk: SttStreamChunk = {
              transcript: transcript.trim(),
              isFinal,
              language,
              confidence,
            };

            if (isFinal) {
              this.emit('final', chunk);
            } else {
              this.emit('partial', chunk);
            }
          }
        } catch {
          // Ignore unparseable non-JSON frames
        }
      };

      this.ws.onerror = (err: any) => {
        if (this.isExplicitlyClosed) return;
        this.emit(
          'error',
          new VoiceProviderError({
            message: `Sarvam realtime STT socket error: ${err?.message || 'Connection error'}`,
            code: 'STT_CONNECTION_ERROR',
            statusCode: 502,
            retryable: true,
            cause: err,
          }),
        );
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        if (!this.isExplicitlyClosed) {
          this.handleUnexpectedClose();
        } else {
          this.emit('close');
        }
      };
    } catch (err: any) {
      if (!this.isExplicitlyClosed) {
        this.handleUnexpectedClose();
      }
    }
  }

  private handleUnexpectedClose(): void {
    if (this.isExplicitlyClosed) return;

    if (this.reconnectAttempts < this.options.maxReconnectRetries) {
      const delay = this.options.reconnectBaseDelayMs * Math.pow(2, this.reconnectAttempts);
      this.reconnectAttempts += 1;
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      this.emit(
        'error',
        new VoiceProviderError({
          message: `Sarvam realtime STT disconnected after ${this.reconnectAttempts} retries`,
          code: 'STT_CONNECTION_ERROR',
          statusCode: 502,
          retryable: false,
        }),
      );
      this.close();
    }
  }

  public isCongested(): boolean {
    if (!this.ws) return false;
    const buffered = typeof this.ws.bufferedAmount === 'number' ? this.ws.bufferedAmount : 0;
    return buffered > this.options.maxBufferedBytes || this.totalQueuedBytes > this.options.maxBufferedBytes;
  }

  public sendAudio(chunk: Buffer): void {
    if (this.isExplicitlyClosed || !chunk || chunk.length === 0) return;

    if (this.isConnected && this.ws?.readyState === 1) {
      try {
        const msg = JSON.stringify({
          event: 'audio_input',
          audio: chunk.toString('base64'),
        });
        this.ws.send(msg);
      } catch {
        this.queueAudio(chunk);
      }
    } else {
      this.queueAudio(chunk);
    }
  }

  private queueAudio(chunk: Buffer): void {
    if (this.totalQueuedBytes + chunk.length > this.maxQueueBytes) {
      // Drop oldest frame to bound memory usage
      const oldest = this.pendingBufferQueue.shift();
      if (oldest) {
        this.totalQueuedBytes -= oldest.length;
      }
    }
    this.pendingBufferQueue.push(chunk);
    this.totalQueuedBytes += chunk.length;
  }

  private flushPendingBuffer(): void {
    while (this.pendingBufferQueue.length > 0 && this.ws?.readyState === 1) {
      const chunk = this.pendingBufferQueue.shift();
      if (chunk) {
        this.totalQueuedBytes -= chunk.length;
        try {
          const msg = JSON.stringify({
            event: 'audio_input',
            audio: chunk.toString('base64'),
          });
          this.ws.send(msg);
        } catch {
          break;
        }
      }
    }
  }

  public endAudio(): void {
    if (this.ws?.readyState === 1) {
      try {
        this.ws.send(JSON.stringify({ event: 'audio_end' }));
      } catch {
        // ignore
      }
    }
  }

  public close(): void {
    if (this.isExplicitlyClosed) return;
    this.isExplicitlyClosed = true;
    this.isConnected = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    this.pendingBufferQueue.length = 0;
    this.totalQueuedBytes = 0;
    this.emit('close');
    this.removeAllListeners();
  }
}

export class SarvamStreamingSttProvider implements IStreamingSttProvider {
  public readonly providerName = 'sarvam';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly defaultLanguage: string;
  private readonly maxBufferedBytes: number;
  private readonly maxReconnectRetries: number;
  private readonly reconnectBaseDelayMs: number;

  constructor(options: SarvamStreamingSttOptions) {
    if (!options.apiKey || !options.apiKey.trim()) {
      throw new VoiceProviderError({
        message: 'SARVAM_API_KEY is not configured',
        code: 'STT_AUTH_ERROR',
        statusCode: 401,
      });
    }
    this.apiKey = options.apiKey.trim().replace(/^["']|["']$/g, '');
    this.baseUrl = (options.baseUrl || 'https://api.sarvam.ai').replace(/\/$/, '');
    this.model = normalizeStreamingSttModel(options.model);
    this.defaultLanguage = (options.defaultLanguage || 'unknown').replace(/^["']|["']$/g, '').trim();
    this.maxBufferedBytes = options.maxBufferedBytes || DEFAULT_MAX_BUFFERED_BYTES;
    this.maxReconnectRetries = options.maxReconnectRetries ?? DEFAULT_MAX_RETRIES;
    this.reconnectBaseDelayMs = options.reconnectBaseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  }

  public async startStreamingSession(options?: StreamingSttOptions): Promise<IStreamingSttSession> {
    const language = (options?.language?.trim() || this.defaultLanguage).replace(/^["']|["']$/g, '').trim();
    const model = normalizeStreamingSttModel(options?.model || this.model);
    const wsBaseUrl = this.baseUrl.replace(/^http/i, 'ws');
    const wsUrl = `${wsBaseUrl}/speech-to-text-realtime/ws?language_code=${encodeURIComponent(
      language,
    )}&model=${encodeURIComponent(model)}`;

    return new SarvamStreamingSttSession(this.apiKey, wsUrl, {
      maxBufferedBytes: this.maxBufferedBytes,
      maxReconnectRetries: this.maxReconnectRetries,
      reconnectBaseDelayMs: this.reconnectBaseDelayMs,
      signal: options?.signal,
    });
  }
}
