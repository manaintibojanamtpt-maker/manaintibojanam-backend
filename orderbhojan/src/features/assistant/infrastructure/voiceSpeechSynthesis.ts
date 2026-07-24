import { AssistantApiError } from '../types';

export type SpeechSynthesisUtteranceLike = {
  text: string;
  lang: string;
  rate: number;
  onend: ((ev?: unknown) => void) | null;
  onerror: ((ev?: unknown) => void) | null;
};

export type SpeechSynthesisLike = {
  speaking: boolean;
  cancel: () => void;
  speak: (utterance: SpeechSynthesisUtteranceLike) => void;
};

export type SpeechSynthesisFactory = () => SpeechSynthesisLike | null;
export type UtteranceFactory = (text: string) => SpeechSynthesisUtteranceLike;

function getDefaultSynthesisFactory(): SpeechSynthesisFactory {
  return () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const synth = window.speechSynthesis;
    return {
      get speaking() {
        return synth.speaking;
      },
      cancel: () => {
        synth.cancel();
      },
      speak: (utterance) => {
        if (typeof SpeechSynthesisUtterance === 'undefined') {
          throw new AssistantApiError({
            code: 'AI_TTS_UNSUPPORTED',
            message: 'Speech synthesis is not available on this device/browser.',
            retryable: false,
          });
        }
        const native = new SpeechSynthesisUtterance(utterance.text);
        native.lang = utterance.lang;
        native.rate = utterance.rate;
        native.onend = () => utterance.onend?.(undefined);
        native.onerror = () => utterance.onerror?.(undefined);
        synth.speak(native);
      },
    };
  };
}

function getDefaultUtteranceFactory(): UtteranceFactory {
  return (text: string) => ({
    text,
    lang: 'en-IN',
    rate: 1,
    onend: null,
    onerror: null,
  });
}

export function isSpeechSynthesisAvailable(
  createSynthesis: SpeechSynthesisFactory = getDefaultSynthesisFactory(),
): boolean {
  return createSynthesis() !== null;
}

/**
 * Optional TTS confirmation — speaks reply text only.
 * Injectable for tests. Never triggers cart/checkout actions.
 */
export async function speakVoiceConfirmation(params: {
  readonly text: string;
  readonly lang?: string;
  readonly createSynthesis?: SpeechSynthesisFactory;
  readonly createUtterance?: UtteranceFactory;
  readonly signal?: AbortSignal;
}): Promise<void> {
  const text = params.text.trim();
  if (!text) {
    throw new AssistantApiError({
      code: 'AI_TTS_EMPTY',
      message: 'Nothing to speak.',
      retryable: false,
    });
  }

  const createSynthesis = params.createSynthesis ?? getDefaultSynthesisFactory();
  const createUtterance = params.createUtterance ?? getDefaultUtteranceFactory();
  const synth = createSynthesis();
  if (!synth) {
    throw new AssistantApiError({
      code: 'AI_TTS_UNSUPPORTED',
      message: 'Speech synthesis is not available on this device/browser.',
      retryable: false,
    });
  }

  const utterance = createUtterance(text.slice(0, 500));
  utterance.lang = params.lang ?? 'en-IN';
  utterance.rate = 1;

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      params.signal?.removeEventListener('abort', onAbort);
      fn();
    };

    const onAbort = () => {
      try {
        synth.cancel();
      } catch {
        // ignore
      }
      finish(() =>
        reject(
          new AssistantApiError({
            code: 'AI_TTS_ABORTED',
            message: 'Speech confirmation was aborted.',
            retryable: false,
          }),
        ),
      );
    };

    params.signal?.addEventListener('abort', onAbort, { once: true });

    utterance.onend = () => finish(() => resolve());
    utterance.onerror = () =>
      finish(() =>
        reject(
          new AssistantApiError({
            code: 'AI_TTS_ERROR',
            message: 'Speech synthesis failed.',
            retryable: true,
          }),
        ),
      );

    try {
      if (synth.speaking) synth.cancel();
      synth.speak(utterance);
    } catch (error) {
      finish(() =>
        reject(
          error instanceof AssistantApiError
            ? error
            : new AssistantApiError({
                code: 'AI_TTS_ERROR',
                message: error instanceof Error ? error.message : 'Failed to speak confirmation',
                retryable: false,
              }),
        ),
      );
    }
  });
}
