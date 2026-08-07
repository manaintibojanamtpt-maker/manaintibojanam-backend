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

/** Telugu WebView STT is weak — prefer native Android recognizer when present. */
function preferNativeSttForLanguage(lang: string): boolean {
  const normalized = lang.trim().toLowerCase();
  return normalized === 'te' || normalized.startsWith('te-') || normalized.startsWith('te_');
}

export function useVoiceStt() {
  const nativeSttEnabled = useAiNativeSttFeature();
  const [listening, setListening] = useState(false);
  const voiceAbortRef = useRef<AbortController | null>(null);

  const voiceCaptureAvailable = useMemo(() => isVoiceCaptureAvailable(), []);

  const cancelListening = useCallback(() => {
    voiceAbortRef.current?.abort();
    voiceAbortRef.current = null;
    forceStopSpeechCapture();
    void nativeSttCancelListening();
    setListening(false);
  }, []);

  const startListening = useCallback(
    async (options: {
      lang: string;
      agentMode: boolean;
      ac: AbortController;
      /** When false, must not open the mic (sheet closed / agent stopped). */
      isVoiceSessionLive?: () => boolean;
    }): Promise<string> => {
      const { lang, agentMode, ac, isVoiceSessionLive } = options;

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

        if (!transcript) {
          if (!voiceCaptureAvailable) {
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
    [nativeSttEnabled, voiceCaptureAvailable],
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
