import { AssistantApiError, type VoiceTranscriptResult } from '../types';

export type { VoiceTranscriptResult };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionResultEventLike = {
  readonly results: ArrayLike<ArrayLike<{ transcript?: string; confidence?: number }>>;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export type SpeechRecognitionFactory = () => SpeechRecognitionLike | null;

function getDefaultSpeechRecognitionFactory(): SpeechRecognitionFactory {
  return () => {
    if (typeof window === 'undefined') return null;
    const w = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return null;
    return new Ctor();
  };
}

function mapSpeechRecognitionError(err: string): {
  readonly code: 'AI_VOICE_PERMISSION_DENIED' | 'AI_VOICE_ERROR' | 'AI_VOICE_EMPTY' | 'AI_VOICE_TIMEOUT';
  readonly message: string;
  readonly retryable: boolean;
} {
  switch (err) {
    case 'not-allowed':
      return {
        code: 'AI_VOICE_PERMISSION_DENIED',
        message:
          'Microphone is blocked. Allow mic for this site (address-bar lock/info → Microphone → Allow), then try again. On Android, enable Microphone for OrderBhojan in system Settings.',
        retryable: false,
      };
    case 'service-not-allowed':
      return {
        code: 'AI_VOICE_PERMISSION_DENIED',
        message:
          'Speech recognition is blocked by browser or site policy. Refresh the page after allowing the microphone, or try Chrome.',
        retryable: false,
      };
    case 'audio-capture':
      return {
        code: 'AI_VOICE_ERROR',
        message: 'No microphone was found or it is in use by another app.',
        retryable: true,
      };
    case 'network':
      return {
        code: 'AI_VOICE_ERROR',
        message: 'Speech recognition needs a network connection. Check connectivity and try again.',
        retryable: true,
      };
    case 'no-speech':
      return {
        code: 'AI_VOICE_EMPTY',
        message: 'No speech heard. Tap the mic and speak clearly, then pause.',
        retryable: true,
      };
    case 'aborted':
      return {
        code: 'AI_VOICE_ERROR',
        message: 'Voice capture was interrupted. Tap the mic to try again.',
        retryable: true,
      };
    default:
      return {
        code: 'AI_VOICE_ERROR',
        message: `Speech recognition failed (${err}). Tap the mic to try again.`,
        retryable: err === 'network' || err === 'no-speech',
      };
  }
}

/**
 * Capture a single utterance via Web Speech API (works in Chrome / many Android WebViews).
 * Injectable factory for tests. Does not call the AI gateway.
 */
export async function captureVoiceTranscript(params: {
  readonly lang?: string;
  readonly timeoutMs?: number;
  readonly platform?: 'web' | 'android' | 'unknown';
  readonly createRecognition?: SpeechRecognitionFactory;
  readonly signal?: AbortSignal;
}): Promise<VoiceTranscriptResult> {
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    throw new AssistantApiError({
      code: 'AI_VOICE_UNSUPPORTED',
      message: 'Voice requires a secure context (HTTPS). Open the site over HTTPS and try again.',
      retryable: false,
    });
  }

  const createRecognition = params.createRecognition ?? getDefaultSpeechRecognitionFactory();
  const recognition = createRecognition();
  if (!recognition) {
    throw new AssistantApiError({
      code: 'AI_VOICE_UNSUPPORTED',
      message: 'Speech recognition is not available on this device/browser. Use Chrome, or type your question.',
      retryable: false,
    });
  }

  // Shorter default for voice-agent turns — stop waiting forever for silence.
  const timeoutMs = params.timeoutMs ?? 7_000;
  const platform = params.platform ?? 'unknown';

  return new Promise<VoiceTranscriptResult>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      params.signal?.removeEventListener('abort', onAbort);
      fn();
    };

    const onAbort = () => {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
      finish(() =>
        reject(
          new AssistantApiError({
            code: 'AI_VOICE_ABORTED',
            message: 'Voice capture was aborted.',
            retryable: false,
          }),
        ),
      );
    };

    const timer = setTimeout(() => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      finish(() =>
        reject(
          new AssistantApiError({
            code: 'AI_VOICE_TIMEOUT',
            message: 'Voice capture timed out.',
            retryable: true,
          }),
        ),
      );
    }, timeoutMs);

    params.signal?.addEventListener('abort', onAbort, { once: true });

    recognition.lang = params.lang ?? 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const first = event.results?.[0]?.[0];
      const transcript = typeof first?.transcript === 'string' ? first.transcript.trim() : '';
      if (!transcript) {
        finish(() =>
          reject(
            new AssistantApiError({
              code: 'AI_VOICE_EMPTY',
              message: 'No speech was recognized. Please try again.',
              retryable: true,
            }),
          ),
        );
        return;
      }
      finish(() =>
        resolve({
          transcript,
          source: 'web_speech',
          platform,
        }),
      );
    };

    recognition.onerror = (event) => {
      const err = event.error ?? 'unknown';
      const mapped = mapSpeechRecognitionError(err);
      finish(() =>
        reject(
          new AssistantApiError({
            code: mapped.code,
            message: mapped.message,
            retryable: mapped.retryable,
          }),
        ),
      );
    };

    recognition.onend = () => {
      // If ended without result/error, treat as empty.
      finish(() =>
        reject(
          new AssistantApiError({
            code: 'AI_VOICE_EMPTY',
            message: 'No speech was recognized. Please try again.',
            retryable: true,
          }),
        ),
      );
    };

    try {
      recognition.start();
    } catch (error) {
      finish(() =>
        reject(
          error instanceof AssistantApiError
            ? error
            : new AssistantApiError({
                code: 'AI_VOICE_ERROR',
                message: error instanceof Error ? error.message : 'Failed to start speech recognition',
                retryable: false,
              }),
        ),
      );
    }
  });
}

export function isVoiceCaptureAvailable(
  createRecognition: SpeechRecognitionFactory = getDefaultSpeechRecognitionFactory(),
): boolean {
  return createRecognition() !== null;
}
