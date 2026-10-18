/**
 * Purpose: Production WebSocket Voice Gateway for genuine realtime STT, conversational turns, and streaming TTS.
 * Public API: setupVoiceGatewayWebSocket
 * Architecture: Client PCM Audio -> Sarvam Realtime STT -> Conversation Engine -> Sarvam Streaming TTS -> Progressive Audio Chunks
 */

import type { Server as HttpServer } from 'http';
import type { Socket, Server as SocketIOServer } from 'socket.io';
import { Server } from 'socket.io';
import { readVoiceConfig } from './voiceConfig.js';
import { SarvamStreamingSttProvider } from './providers/sarvamStreamingSttProvider.js';
import { SarvamStreamingTtsProvider } from './providers/sarvamStreamingTtsProvider.js';
import type { IStreamingSttSession } from './providers/types.js';
import { processVoiceAssistantTurn, type VoiceTurnParams, type VoiceTurnOutcome } from './voiceTurnProcessor.js';

export interface VoiceGatewayDependencies {
  readonly onTranscriptReceived?: (params: VoiceTurnParams) => Promise<Partial<VoiceTurnOutcome>>;
  readonly verifyToken?: (token: string) => Promise<{ uid: string } | null>;
  readonly sttProvider?: SarvamStreamingSttProvider;
  readonly ttsProvider?: SarvamStreamingTtsProvider;
}

export function setupVoiceGatewayWebSocket(
  httpServer: HttpServer,
  deps: VoiceGatewayDependencies = {},
): SocketIOServer {
  const io = new Server(httpServer, {
    path: '/api/voice/stream',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e6, // 1MB per socket frame
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      // Allow guest/unauthenticated users to use voice assistant
      if (!token || token === 'guest') {
        (socket as any).userId = 'guest';
        return next();
      }

      if (deps.verifyToken) {
        const user = await deps.verifyToken(token);
        if (!user) {
          return next(new Error('Invalid authentication token'));
        }
        (socket as any).userId = user.uid;
      }
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const config = readVoiceConfig();
    const sessionId = (socket.handshake.query.sessionId as string) || `vs_${Date.now()}`;
    const language = (socket.handshake.query.lang as string) || config.sarvamSttLanguage;
    const userId = (socket as any).userId;

    let sttSession: IStreamingSttSession | null = null;
    let activeTtsAbortController: AbortController | null = null;
    let activeTurnAbortController: AbortController | null = null;
    let isProcessingTurn = false;

    const sttProvider =
      deps.sttProvider ||
      (config.sarvamApiKey
        ? new SarvamStreamingSttProvider({
            apiKey: config.sarvamApiKey,
            baseUrl: config.sarvamBaseUrl,
            model: config.sarvamStreamingSttModel,
            defaultLanguage: language,
          })
        : null);

    const ttsProvider =
      deps.ttsProvider ||
      (config.sarvamApiKey
        ? new SarvamStreamingTtsProvider({
            apiKey: config.sarvamApiKey,
            baseUrl: config.sarvamBaseUrl,
            model: config.sarvamTtsModel,
            defaultVoice: config.sarvamTtsVoice,
          })
        : null);

    // Initialize Streaming STT session
    const initSttSession = async () => {
      if (!sttProvider) {
        socket.emit('voice:ready', {
          sessionId,
          provider: 'fallback',
          streaming: false,
          note: 'Sarvam streaming provider not configured',
        });
        return;
      }

      try {
        sttSession = await sttProvider.startStreamingSession({
          language,
          model: config.sarvamStreamingSttModel,
        });

        sttSession.on('partial', (chunk) => {
          // Send live captions to UI — DO NOT execute business logic on partials
          socket.emit('voice:transcript:partial', {
            transcript: chunk.transcript,
            isFinal: false,
            language: chunk.language || language,
            confidence: chunk.confidence,
          });
        });

        sttSession.on('final', async (chunk) => {
          socket.emit('voice:transcript:final', {
            transcript: chunk.transcript,
            isFinal: true,
            language: chunk.language || language,
            confidence: chunk.confidence,
          });

          // Trigger authoritative conversational turn only on final transcript
          await handleFinalTranscript(chunk.transcript, chunk.language || language);
        });

        sttSession.on('error', (err) => {
          socket.emit('voice:error', {
            code: err.code || 'STT_PROVIDER_ERROR',
            message: err.message || 'Streaming STT error',
          });
        });

        socket.emit('voice:ready', {
          sessionId,
          provider: 'sarvam',
          streaming: true,
          model: config.sarvamStreamingSttModel,
        });
      } catch (err: any) {
        socket.emit('voice:error', {
          code: 'STT_CONNECTION_ERROR',
          message: err?.message || 'Failed to establish streaming STT session',
        });
      }
    };

    let clientContext: Record<string, any> = {
      tenantId: socket.handshake.query.tenantId as string,
      restaurantId: socket.handshake.query.restaurantId as string,
      mode: socket.handshake.query.mode as any,
      channel: socket.handshake.query.channel as any,
    };

    socket.on('voice:context', (update: any) => {
      if (update && typeof update === 'object') {
        clientContext = { ...clientContext, ...update };
      }
    });

    socket.on('voice:proposal:confirm', () => {
      if (clientContext.context) {
        clientContext.context.currentProposal = null;
      }
    });

    socket.on('voice:proposal:clear', () => {
      if (clientContext.context) {
        clientContext.context.currentProposal = null;
        clientContext.context.pendingClarification = null;
      }
    });

    const handleFinalTranscript = async (transcript: string, lang: string) => {
      if (!transcript.trim() || isProcessingTurn) return;
      isProcessingTurn = true;
      const turnStart = Date.now();
      activeTurnAbortController = new AbortController();
      const turnSignal = activeTurnAbortController.signal;

      try {
        const turnParams: VoiceTurnParams = {
          sessionId,
          transcript,
          language: lang,
          userId,
          tenantId: clientContext.tenantId,
          restaurantId: clientContext.restaurantId,
          mode: clientContext.mode,
          channel: clientContext.channel,
          context: clientContext.context || clientContext,
        };

        const outcome = deps.onTranscriptReceived
          ? await deps.onTranscriptReceived(turnParams)
          : await processVoiceAssistantTurn(turnParams);

        if (turnSignal.aborted) return;

        if (outcome.pendingClarification !== undefined) {
          if (!clientContext.context) clientContext.context = {};
          clientContext.context.pendingClarification = outcome.pendingClarification;
        }

        if (outcome.intent === 'cart_add_plan' && outcome.proposedActions) {
          if (!clientContext.context) clientContext.context = {};
          clientContext.context.currentProposal = outcome.proposedActions
            .filter((a) => a.type === 'cart_add_plan')
            .map((a) => a.payload as any);
        } else if (outcome.intent === 'cancel_order' || outcome.proposedActions?.some((a) => a.type === 'clear_proposal')) {
          if (clientContext.context) {
            clientContext.context.currentProposal = null;
          }
        }

        const turnLatency = Date.now() - turnStart;
        socket.emit('voice:turn:result', {
          reply: outcome.reply,
          proposedActions: outcome.proposedActions,
          intent: outcome.intent,
          language: outcome.language || lang,
          correlationId: outcome.correlationId,
          latencyMs: turnLatency,
          pendingClarification: outcome.pendingClarification,
        });

        if (outcome.intent === 'stop_speaking') {
          cancelActiveTts();
        }

        // Progressive Streaming TTS
        if (outcome.reply && ttsProvider && !turnSignal.aborted) {
          cancelActiveTts();
          activeTtsAbortController = new AbortController();
          const signal = activeTtsAbortController.signal;

          socket.emit('voice:tts:start', { sessionId, turnId: outcome.correlationId });

          let chunkIndex = 0;
          let firstAudioEmittedAt: number | null = null;
          try {
            for await (const chunk of ttsProvider.generateSpeechStream(
              { text: outcome.reply, language: outcome.language || lang },
              signal,
            )) {
              if (signal.aborted || turnSignal.aborted) break;
              if (firstAudioEmittedAt === null) {
                firstAudioEmittedAt = Date.now();
                socket.emit('voice:timing', {
                  correlationId: outcome.correlationId,
                  turnToFirstAudioMs: firstAudioEmittedAt - turnStart,
                });
              }
              socket.emit('voice:tts:chunk', {
                turnId: outcome.correlationId,
                chunkBase64: chunk.toString('base64'),
                index: chunkIndex++,
              });
            }

            if (!signal.aborted && !turnSignal.aborted) {
              socket.emit('voice:tts:end', {
                sessionId,
                turnId: outcome.correlationId,
                totalChunks: chunkIndex,
              });
            }
          } catch (ttsErr: any) {
            if (!signal.aborted && !turnSignal.aborted) {
              socket.emit('voice:error', {
                code: 'TTS_PROVIDER_ERROR',
                message: ttsErr?.message || 'TTS streaming error',
              });
            }
          }
        }
      } catch (err: any) {
        if (!turnSignal.aborted) {
          socket.emit('voice:error', {
            code: 'VOICE_SESSION_ERROR',
            message: err?.message || 'Failed to process voice turn',
          });
        }
      } finally {
        isProcessingTurn = false;
        activeTurnAbortController = null;
      }
    };

    const cancelActiveTts = (turnId?: string) => {
      if (activeTtsAbortController) {
        activeTtsAbortController.abort();
        activeTtsAbortController = null;
        socket.emit('voice:tts:cancelled', { sessionId, turnId });
      }
    };

    const cancelActiveTurn = () => {
      if (activeTurnAbortController) {
        activeTurnAbortController.abort();
        activeTurnAbortController = null;
      }
      cancelActiveTts();
    };

    // Initialize upon connection
    await initSttSession();

    // Client audio streaming frame
    socket.on('audio:chunk', (data: Buffer | ArrayBuffer | { audioBase64?: string }) => {
      let buffer: Buffer;
      if (Buffer.isBuffer(data)) {
        buffer = data;
      } else if (data instanceof ArrayBuffer) {
        buffer = Buffer.from(data);
      } else if (typeof data?.audioBase64 === 'string') {
        buffer = Buffer.from(data.audioBase64, 'base64');
      } else {
        return;
      }

      if (sttSession) {
        if (sttSession.isCongested()) {
          socket.emit('voice:backpressure', { status: 'congested' });
        }
        sttSession.sendAudio(buffer);
      }
    });

    // Client signal that utterance finished
    socket.on('audio:end', () => {
      if (sttSession) {
        sttSession.endAudio();
      }
    });

    // Direct conversational text turn over WebSocket
    socket.on('voice:turn', async (data: { transcript: string; language?: string; context?: any; mode?: any }) => {
      if (data?.context) {
        clientContext = { ...clientContext, ...data.context, context: data.context };
      }
      if (data?.transcript) {
        await handleFinalTranscript(data.transcript, data.language || language);
      }
    });

    // Barge-in: user began speaking while TTS was still playing
    socket.on('voice:barge_in', () => {
      cancelActiveTurn();
    });

    // Client explicitly cancelled
    socket.on('voice:cancel', () => {
      cancelActiveTurn();
      if (sttSession) {
        sttSession.endAudio();
      }
    });

    // Clean disconnect
    socket.on('disconnect', () => {
      cancelActiveTurn();
      if (sttSession) {
        sttSession.close();
        sttSession = null;
      }
    });
  });

  return io;
}
