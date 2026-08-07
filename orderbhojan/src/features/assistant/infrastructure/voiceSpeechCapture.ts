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

/** Serialize Web Speech sessions — Chrome aborts overlapping start()/abort(). */
let captureGate: Promise<void> = Promise.resolve();
let lastRecognitionEndedAt = 0;
let activeRecognition: SpeechRecognitionLike | null = null;
let captureGeneration = 0;

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
      // Chrome often fires this after TTS, stop(), or rapid restart — not a hard failure.
      return {
        code: 'AI_VOICE_TIMEOUT',
        message: 'Listening reset — tap the mic and speak again.',
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

/** Release TTS/audio before opening the mic (Web Speech + speechSynthesis share the device). */
export async function settleMicForSpeechCapture(minGapMs = 450): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if (window.speechSynthesis?.speaking || window.speechSynthesis?.pending) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore
  }
  const elapsed = Date.now() - lastRecognitionEndedAt;
  const wait = Math.max(minGapMs, Math.max(0, 280 - elapsed));
  await new Promise((r) => setTimeout(r, wait));
}

/**
 * Hard-stop any in-flight Web Speech recognition + cancel TTS.
 * Must run on sheet close — AbortController alone can miss gaps between turns.
 */
export function forceStopSpeechCapture(): void {
  captureGeneration += 1;
  const rec = activeRecognition;
  activeRecognition = null;
  if (rec) {
    try {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
    } catch {
      // ignore
    }
    try {
      rec.abort();
    } catch {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    }
  }
  lastRecognitionEndedAt = Date.now();
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore
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

  // Allow a natural pause after TTS before declaring timeout.
  const timeoutMs = params.timeoutMs ?? 8_000;
  const platform = params.platform ?? 'unknown';
  const myGeneration = captureGeneration;

  const run = async (): Promise<VoiceTranscriptResult> => {
    // A close/hard-stop while we were queued must not open the mic.
    if (myGeneration !== captureGeneration || params.signal?.aborted) {
      throw new AssistantApiError({
        code: 'AI_VOICE_ABORTED',
        message: 'Voice capture was aborted.',
        retryable: false,
      });
    }

    await settleMicForSpeechCapture(params.signal?.aborted ? 0 : 450);

    if (myGeneration !== captureGeneration || params.signal?.aborted) {
      throw new AssistantApiError({
        code: 'AI_VOICE_ABORTED',
        message: 'Voice capture was aborted.',
        retryable: false,
      });
    }

    return new Promise<VoiceTranscriptResult>((resolve, reject) => {
      let settled = false;
      let finalTranscript = '';
      let sawResult = false;
      let intentionalAbort = false;

      activeRecognition = recognition;

      const markEnded = () => {
        if (activeRecognition === recognition) {
          activeRecognition = null;
        }
        lastRecognitionEndedAt = Date.now();
      };

      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        params.signal?.removeEventListener('abort', onAbort);
        markEnded();
        fn();
      };

      const onAbort = () => {
        intentionalAbort = true;
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
        // Prefer any transcript collected over a hard timeout error.
        if (finalTranscript.trim()) {
          finish(() =>
            resolve({
              transcript: finalTranscript.trim(),
              source: 'web_speech',
              platform,
            }),
          );
          return;
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
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.continuous = false;

      recognition.onresult = (event) => {
        if (myGeneration !== captureGeneration) {
          intentionalAbort = true;
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
          return;
        }
        sawResult = true;
        const results = event.results;
        let interimBuilder = '';
        let finalBuilder = '';

        for (let i = 0; i < (results?.length ?? 0); i += 1) {
          const row = results[i];
          const alt = row?.[0];
          const piece = typeof alt?.transcript === 'string' ? alt.transcript.trim() : '';
          if (!piece) continue;

          const isFinal = Boolean((row as { isFinal?: boolean }).isFinal);
          if (isFinal) {
            finalBuilder += piece + ' ';
          } else {
            interimBuilder += piece + ' ';
          }
        }

        finalTranscript = finalBuilder.trim() || interimBuilder.trim();

        // Resolve once we have a final segment — stop recognition promptly.
        const last = results?.[(results.length ?? 1) - 1] as { isFinal?: boolean } | undefined;
        if (last?.isFinal && finalTranscript.trim()) {
          try {
            recognition.stop();
          } catch {
            // ignore
          }
          finish(() =>
            resolve({
              transcript: finalTranscript.trim(),
              source: 'web_speech',
              platform,
            }),
          );
        }
      };

      recognition.onerror = (event) => {
        const err = event.error ?? 'unknown';
        // Intentional AbortSignal → already rejected as AI_VOICE_ABORTED.
        if (err === 'aborted' && intentionalAbort) {
          return;
        }
        // Hard-stop generation bump — treat as abort, not user-facing error.
        if (myGeneration !== captureGeneration || err === 'aborted') {
          if (finalTranscript.trim()) {
            finish(() =>
              resolve({
                transcript: finalTranscript.trim(),
                source: 'web_speech',
                platform,
              }),
            );
            return;
          }
          if (myGeneration !== captureGeneration || intentionalAbort || params.signal?.aborted) {
            finish(() =>
              reject(
                new AssistantApiError({
                  code: 'AI_VOICE_ABORTED',
                  message: 'Voice capture was aborted.',
                  retryable: false,
                }),
              ),
            );
            return;
          }
        }
        // no-speech after partial interim — still try to use what we heard.
        if (err === 'no-speech' && finalTranscript.trim()) {
          finish(() =>
            resolve({
              transcript: finalTranscript.trim(),
              source: 'web_speech',
              platform,
            }),
          );
          return;
        }
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
        if (finalTranscript.trim()) {
          finish(() =>
            resolve({
              transcript: finalTranscript.trim(),
              source: 'web_speech',
              platform,
            }),
          );
          return;
        }
        // If we already rejected/resolved via onerror/timer, ignore.
        if (settled) return;
        if (myGeneration !== captureGeneration || params.signal?.aborted) {
          finish(() =>
            reject(
              new AssistantApiError({
                code: 'AI_VOICE_ABORTED',
                message: 'Voice capture was aborted.',
                retryable: false,
              }),
            ),
          );
          return;
        }
        finish(() =>
          reject(
            new AssistantApiError({
              code: 'AI_VOICE_EMPTY',
              message: sawResult
                ? 'Speech was unclear. Please say the dish and kitchen again.'
                : 'No speech was recognized. Please try again.',
              retryable: true,
            }),
          ),
        );
      };

      try {
        if (myGeneration !== captureGeneration || params.signal?.aborted) {
          throw new AssistantApiError({
            code: 'AI_VOICE_ABORTED',
            message: 'Voice capture was aborted.',
            retryable: false,
          });
        }
        recognition.start();
      } catch (error) {
        // InvalidStateError = recognition already started — soft-retry as timeout.
        const msg = error instanceof Error ? error.message : 'Failed to start speech recognition';
        finish(() =>
          reject(
            error instanceof AssistantApiError
              ? error
              : new AssistantApiError({
                  code: /already started|InvalidState/i.test(msg)
                    ? 'AI_VOICE_TIMEOUT'
                    : 'AI_VOICE_ERROR',
                  message: /already started|InvalidState/i.test(msg)
                    ? 'Listening reset — tap the mic and speak again.'
                    : msg,
                  retryable: true,
                }),
          ),
        );
      }
    });
  };

  const queued = captureGate.then(run, run);
  captureGate = queued.then(
    () => undefined,
    () => undefined,
  );
  return queued;
}

export function isVoiceCaptureAvailable(
  createRecognition: SpeechRecognitionFactory = getDefaultSpeechRecognitionFactory(),
): boolean {
  return createRecognition() !== null;
}
