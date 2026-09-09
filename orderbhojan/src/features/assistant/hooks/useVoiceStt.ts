import { useCallback, useRef, useState, useMemo } from 'react';
import {
  captureNativeAndroidStt,
  isNativeAndroidSttAvailable,
  nativeSttCancelListening,
} from '../infrastructure/nativeAndroidSttBridge';
import {
  captureVoiceTranscript,
  forceStopSpeechCapture,
  isVoiceCaptureAvailable,
  settleMicForSpeechCapture,
} from '../infrastructure/voiceSpeechCapture';
import { AssistantApiError } from '../types';
import { useAiNativeSttFeature } from '../hooks/useAiNativeSttFeature';
import { useAiVoiceStreamingFeature } from '../hooks/useAiVoiceStreamingFeature';
import {
  createRealtimeVoiceClient,
  isVoiceStreamingSupported,
  type RealtimeVoiceSession,
} from '../infrastructure/realtimeVoiceClient';

/** Telugu WebView STT is weak — prefer native Android recognizer when present. */
function preferNativeSttForLanguage(lang: string): boolean {
  const normalized = lang.trim().toLowerCase();
  return normalized === 'te' || normalized.startsWith('te-') || normalized.startsWith('te_');
}

export function useVoiceStt() {
  const nativeSttEnabled = useAiNativeSttFeature();
  const streamingEnabled = useAiVoiceStreamingFeature();
  const [listening, setListening] = useState(false);
  const voiceAbortRef = useRef<AbortController | null>(null);
  const realtimeClientRef = useRef<RealtimeVoiceSession | null>(null);

  const voiceCaptureAvailable = useMemo(
    () => isVoiceCaptureAvailable() || isVoiceStreamingSupported(),
    [],
  );

  const cancelListening = useCallback(() => {
    voiceAbortRef.current?.abort();
    voiceAbortRef.current = null;
    if (realtimeClientRef.current) {
      realtimeClientRef.current.cancel();
      realtimeClientRef.current.disconnect();
      realtimeClientRef.current = null;
    }
    forceStopSpeechCapture();
    void nativeSttCancelListening();
    setListening(false);
  }, []);

  const startListening = useCallback(
    async (options: {
      lang: string;
      agentMode: boolean;
      ac: AbortController;
      onInterim?: (partial: string) => void;
      /** When false, must not open the mic (sheet closed / agent stopped). */
      isVoiceSessionLive?: () => boolean;
    }): Promise<string> => {
      const { lang, agentMode, ac, onInterim, isVoiceSessionLive } = options;

      const sessionLive = () => isVoiceSessionLive?.() !== false && !ac.signal.aborted;

      const canUseNative =
        isNativeAndroidSttAvailable() &&
        (nativeSttEnabled || preferNativeSttForLanguage(lang));
      if (!canUseNative && !voiceCaptureAvailable) {
        throw new AssistantApiError({
          code: 'AI_VOICE_UNSUPPORTED',
          message: 'Speech recognition is not available on this device.',
          retryable: false,
        });
      }

      if (!sessionLive()) {
        throw new AssistantApiError({
          code: 'AI_VOICE_ABORTED',
          message: 'Voice capture was aborted.',
          retryable: false,
        });
      }

      voiceAbortRef.current = ac;
      setListening(true);

      try {
        let transcript: string | undefined;

        // 1. Preferred path: Realtime streaming STT over WebSocket (/api/voice/stream)
        if (streamingEnabled && isVoiceStreamingSupported() && !canUseNative) {
          try {
            let sessionResolver: ((val: string) => void) | null = null;
            let sessionRejecter: ((err: any) => void) | null = null;

            const session = createRealtimeVoiceClient({
              onPartialTranscript: (data) => {
                if (sessionLive() && data.transcript) {
                  onInterim?.(data.transcript);
                }
              },
              onFinalTranscript: (data) => {
                if (sessionResolver && data.transcript?.trim()) {
                  sessionResolver(data.transcript.trim());
                  sessionResolver = null;
                }
              },
              onError: (err) => {
                if (sessionRejecter) {
                  sessionRejecter(
                    new AssistantApiError({
                      code: 'AI_VOICE_ERROR',
                      message: err?.message || 'Streaming STT failed',
                      retryable: true,
                    }),
                  );
                  sessionRejecter = null;
                }
              },
            });

            realtimeClientRef.current = session;
            const connected = await session.connect();

            if (connected && sessionLive()) {
              const micStarted = await session.startMicrophoneCapture();
              if (micStarted) {
                transcript = await new Promise<string>((resolve, reject) => {
                  sessionResolver = resolve;
                  sessionRejecter = reject;

                  const timer = setTimeout(() => {
                    if (sessionRejecter) {
                      sessionRejecter(
                        new AssistantApiError({
                          code: 'AI_VOICE_TIMEOUT',
                          message: 'No speech detected within time limit.',
                          retryable: true,
                        }),
                      );
                      sessionRejecter = null;
                    }
                  }, agentMode ? 10_000 : 7_000);

                  ac.signal.addEventListener(
                    'abort',
                    () => {
                      clearTimeout(timer);
                      if (sessionRejecter) {
                        sessionRejecter(
                          new AssistantApiError({
                            code: 'AI_VOICE_ABORTED',
                            message: 'Voice capture was aborted.',
                            retryable: false,
                          }),
                        );
                        sessionRejecter = null;
                      }
                    },
                    { once: true },
                  );
                });
              }
            }
          } catch (streamErr) {
            if (
              streamErr instanceof AssistantApiError &&
              (streamErr.code === 'AI_VOICE_ABORTED' || streamErr.code === 'AI_VOICE_TIMEOUT')
            ) {
              throw streamErr;
            }
            // Otherwise fall back quietly to Web Speech
          } finally {
            if (realtimeClientRef.current) {
              realtimeClientRef.current.stopMicrophoneCapture();
              realtimeClientRef.current.disconnect();
              realtimeClientRef.current = null;
            }
          }
        }

        // 2. Fallback path: Native Android STT bridge
        if (!transcript && canUseNative) {
          try {
            const native = await captureNativeAndroidStt({
              enabled: canUseNative,
              signal: ac.signal,
              lang,
            });
            if (native?.transcript) {
              transcript = native.transcript;
            }
          } catch (nativeErr) {
            if (
              nativeErr instanceof AssistantApiError &&
              nativeErr.code === 'AI_VOICE_PERMISSION_DENIED'
            ) {
              throw nativeErr;
            }
            if (
              nativeErr instanceof AssistantApiError &&
              (nativeErr.code === 'AI_VOICE_ABORTED' ||
                (nativeErr.code === 'AI_VOICE_EMPTY' && !voiceCaptureAvailable))
            ) {
              throw nativeErr;
            }
          }
        }

        // 3. Fallback path: Web Speech API
        if (!transcript) {
          if (!isVoiceCaptureAvailable()) {
            throw new AssistantApiError({
              code: 'AI_VOICE_UNSUPPORTED',
              message: 'Native voice failed and Web Speech is unavailable. Type your request instead.',
              retryable: false,
            });
          }
          // Cancel leftover TTS / prior recognition before opening the mic.
          await settleMicForSpeechCapture(agentMode ? 550 : 400);
          if (!sessionLive()) {
            forceStopSpeechCapture();
            throw new AssistantApiError({
              code: 'AI_VOICE_ABORTED',
              message: 'Voice capture was aborted.',
              retryable: false,
            });
          }
          const web = await captureVoiceTranscript({
            signal: ac.signal,
            platform: 'web',
            lang,
            // Live agent: longer window so pause after dish name is OK.
            timeoutMs: agentMode ? 10_000 : 7_000,
          });
          transcript = web.transcript;
        }

        if (!sessionLive()) {
          forceStopSpeechCapture();
          throw new AssistantApiError({
            code: 'AI_VOICE_ABORTED',
            message: 'Voice capture was aborted.',
            retryable: false,
          });
        }

        return transcript;
      } finally {
        if (voiceAbortRef.current === ac) {
          voiceAbortRef.current = null;
        }
        setListening(false);
      }
    },
    [nativeSttEnabled, streamingEnabled, voiceCaptureAvailable],
  );

  return {
    listening,
    setListening,
    startListening,
    cancelListening,
    voiceCaptureAvailable,
    voiceAbortRef,
  };
}
