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
  readonly results: ArrayLike<ArrayLike<{ transcript?: string }>>;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export type MarketingSpeechRecognitionFactory = () => SpeechRecognitionLike | null;

function getDefaultFactory(): MarketingSpeechRecognitionFactory {
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

function friendlySpeechError(err: string): string {
  switch (err) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone is blocked. Allow mic for this site (address-bar lock → Microphone → Allow), then try again.';
    case 'no-speech':
      return 'No speech heard. Tap the mic and speak clearly.';
    case 'network':
      return 'Speech recognition needs a network connection. Check connectivity and try again.';
    case 'audio-capture':
      return 'No microphone was found or it is in use by another app.';
    default:
      return `Speech recognition failed (${err}). You can type your question instead.`;
  }
}

export function isMarketingVoiceCaptureAvailable(
  createRecognition: MarketingSpeechRecognitionFactory = getDefaultFactory(),
): boolean {
  if (typeof window !== 'undefined' && window.isSecureContext === false) return false;
  return createRecognition() !== null;
}

/** Single-utterance capture for marketing assistant. Does not call the AI gateway. */
export async function captureMarketingVoiceTranscript(params?: {
  readonly lang?: string;
  readonly timeoutMs?: number;
  readonly createRecognition?: MarketingSpeechRecognitionFactory;
  readonly signal?: AbortSignal;
}): Promise<string> {
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    throw new Error('Voice requires HTTPS. Open www.bhojanos.com over a secure connection.');
  }

  const createRecognition = params?.createRecognition ?? getDefaultFactory();
  const recognition = createRecognition();
  if (!recognition) {
    throw new Error('Speech recognition is not available in this browser. Type your question instead.');
  }

  const timeoutMs = params?.timeoutMs ?? 12_000;

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      params?.signal?.removeEventListener('abort', onAbort);
      fn();
    };

    const onAbort = () => {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
      finish(() => reject(new Error('Voice capture was cancelled.')));
    };

    const timer = setTimeout(() => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      finish(() => reject(new Error('Voice capture timed out. Tap the mic to try again.')));
    }, timeoutMs);

    params?.signal?.addEventListener('abort', onAbort, { once: true });

    recognition.lang = params?.lang ?? 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const first = event.results?.[0]?.[0];
      const transcript = typeof first?.transcript === 'string' ? first.transcript.trim() : '';
      if (!transcript) {
        finish(() => reject(new Error('No speech was recognized. Please try again.')));
        return;
      }
      finish(() => resolve(transcript));
    };

    recognition.onerror = (event) => {
      finish(() => reject(new Error(friendlySpeechError(event.error ?? 'unknown'))));
    };

    recognition.onend = () => {
      finish(() => reject(new Error('No speech was recognized. Please try again.')));
    };

    try {
      recognition.start();
    } catch (error) {
      finish(() =>
        reject(error instanceof Error ? error : new Error('Failed to start speech recognition')),
      );
    }
  });
}
