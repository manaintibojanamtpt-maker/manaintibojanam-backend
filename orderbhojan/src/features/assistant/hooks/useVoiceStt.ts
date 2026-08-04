import { useCallback, useRef, useState, useMemo } from 'react';
import {
  captureNativeAndroidStt,
  isNativeAndroidSttAvailable,
  nativeSttCancelListening,
} from '../infrastructure/nativeAndroidSttBridge';
import { captureVoiceTranscript, isVoiceCaptureAvailable } from '../infrastructure/voiceSpeechCapture';
import { AssistantApiError } from '../types';
import { useAiNativeSttFeature } from '../hooks/useAiNativeSttFeature';

export function useVoiceStt() {
  const nativeSttEnabled = useAiNativeSttFeature();
  const [listening, setListening] = useState(false);
  const voiceAbortRef = useRef<AbortController | null>(null);

  const voiceCaptureAvailable = useMemo(() => isVoiceCaptureAvailable(), []);

  const cancelListening = useCallback(() => {
    voiceAbortRef.current?.abort();
    void nativeSttCancelListening();
    setListening(false);
  }, []);

  const startListening = useCallback(
    async (options: { lang: string; agentMode: boolean; ac: AbortController }): Promise<string> => {
      const { lang, agentMode, ac } = options;
      
      const canUseNative = nativeSttEnabled && isNativeAndroidSttAvailable();
      if (!canUseNative && !voiceCaptureAvailable) {
        throw new AssistantApiError({
          code: 'AI_VOICE_UNSUPPORTED',
          message: 'Speech recognition is not available on this device.',
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
          const web = await captureVoiceTranscript({
            signal: ac.signal,
            platform: 'web',
            lang,
            timeoutMs: agentMode ? 14_000 : 10_000,
          });
          transcript = web.transcript;
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
