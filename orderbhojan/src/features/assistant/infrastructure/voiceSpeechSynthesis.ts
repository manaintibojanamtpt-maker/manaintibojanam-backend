import { AssistantApiError } from '../types';

export type SpeechSynthesisUtteranceLike = {
  text: string;
  lang: string;
  rate: number;
  onend: ((ev?: unknown) => void) | null;
  onerror: ((ev?: unknown) => void) | null;
  voice?: any;
};

export type SpeechSynthesisLike = {
  speaking: boolean;
  cancel: () => void;
  speak: (utterance: SpeechSynthesisUtteranceLike) => void;
  getVoices?: () => any[];
};

export type SpeechSynthesisFactory = () => SpeechSynthesisLike | null;
export type UtteranceFactory = (text: string) => SpeechSynthesisUtteranceLike;

import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { loadFeatureFlags, isFeatureEnabled } from '../../../featureFlags/flags';
import { getAppConfig } from '@/config';
import { getMarketplaceAuthTokenProvider } from '@/marketplace-api';
import { trackEvent } from '@/telemetry';

function getDefaultSynthesisFactory(): SpeechSynthesisFactory {
  return () => {
    if (Capacitor.isNativePlatform()) {
      return {
        get speaking() {
          return false;
        },
        cancel: () => {
          TextToSpeech.stop().catch(console.error);
        },
        speak: async (utterance) => {
          try {
            await TextToSpeech.speak({
              text: utterance.text,
              lang: utterance.lang,
              rate: utterance.rate,
            });
            utterance.onend?.(undefined);
          } catch (err) {
            console.error('Native TTS error:', err);
            utterance.onerror?.(err);
          }
        },
      };
    }

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

        const trySpeak = (voices: SpeechSynthesisVoice[]) => {
          if (voices.length > 0) {
            const langPrefix = utterance.lang.split('-')[0];
            const matchedVoice = voices.find(v => v.lang === utterance.lang) || 
                                 voices.find(v => v.lang.startsWith(langPrefix)) ||
                                 voices.find(v => v.default);
            if (matchedVoice) {
              native.voice = matchedVoice;
            }
          }
          synth.speak(native);
        };

        let voices = synth.getVoices();
        if (voices.length > 0) {
          trySpeak(voices);
        } else {
          // Wait for voiceschanged, with fallback timeout
          let fired = false;
          const onVoicesChanged = () => {
            if (fired) return;
            fired = true;
            synth.removeEventListener('voiceschanged', onVoicesChanged);
            trySpeak(synth.getVoices());
          };
          synth.addEventListener('voiceschanged', onVoicesChanged);
          setTimeout(() => {
            if (!fired) onVoicesChanged();
          }, 1000);
        }
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

let sharedAudioContext: AudioContext | null = null;

export function unlockAudioContext(): void {
  if (typeof window === 'undefined') return;
  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioContext = new AudioContextClass();
    }
  }
  if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(console.warn);
  }
}

async function speakCloudTts(text: string, signal?: AbortSignal): Promise<void> {
  const apiUrl = getAppConfig().marketplaceApiBaseUrl.replace(/\/$/, '');
  const tokenProvider = getMarketplaceAuthTokenProvider();
  const token = tokenProvider ? await tokenProvider() : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${apiUrl}/api/voice/tts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Cloud TTS failed with status ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('AudioContext not supported on this device');
    }
    sharedAudioContext = new AudioContextClass();
  }

  // Best effort resume if it's still suspended
  if (sharedAudioContext.state === 'suspended') {
    await sharedAudioContext.resume().catch(console.warn);
  }

  const audioBuffer = await sharedAudioContext.decodeAudioData(arrayBuffer);

  return new Promise<void>((resolve, reject) => {
    if (!sharedAudioContext) {
      reject(new Error('AudioContext was lost'));
      return;
    }
    const source = sharedAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(sharedAudioContext.destination);

    const onAbort = () => {
      source.stop();
      source.disconnect();
      reject(new AssistantApiError({ code: 'AI_TTS_ABORTED', message: 'Aborted', retryable: false }));
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    source.onended = () => {
      if (signal) signal.removeEventListener('abort', onAbort);
      source.disconnect();
      resolve();
    };

    source.start(0);
  });
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

  const flags = loadFeatureFlags();
  const cloudTtsEnabled = isFeatureEnabled(flags, 'FF_OB_AI_CLOUD_TTS') && typeof window !== 'undefined';

  if (cloudTtsEnabled) {
    try {
      await speakCloudTts(text, params.signal);
      return;
    } catch (err) {
      console.warn('[Voice TTS] Cloud fallback to native:', err);
      trackEvent({
        name: 'cloud_tts_fallback',
        properties: {
          error_message: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  const createSynthesis = params.createSynthesis ?? getDefaultSynthesisFactory();
  const createUtterance = params.createUtterance ?? getDefaultUtteranceFactory();
  const synth = createSynthesis();
  if (!synth) {
    // If no native TTS, try cloud as a last resort before failing
    if (!cloudTtsEnabled && typeof window !== 'undefined') {
       try {
         await speakCloudTts(text, params.signal);
         return;
       } catch (e) {
         // ignore
       }
    }
    throw new AssistantApiError({
      code: 'AI_TTS_UNSUPPORTED',
      message: 'Speech synthesis is not available on this device/browser.',
      retryable: false,
    });
  }

  const utterance = createUtterance(text.slice(0, 500));
  const targetLang = params.lang ?? 'en-IN';
  utterance.lang = targetLang;
  utterance.rate = 1;

  let voices = synth.getVoices ? synth.getVoices() : [];
  if (voices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    await new Promise<void>((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      }, 500); // give it up to 500ms to load voices
      window.speechSynthesis.onvoiceschanged = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve();
        }
      };
    });
    voices = synth.getVoices ? synth.getVoices() : [];
  }

  if (voices.length > 0) {
    const primaryLang = targetLang.split('-')[0].toLowerCase();
    // 1. Try exact match (e.g. te-IN)
    // 2. Try primary language match (e.g. te)
    // 3. Try to find any "Google" voice for that language if available
    const voice = 
      voices.find(v => v.lang.toLowerCase() === targetLang.toLowerCase()) || 
      voices.find(v => v.lang.toLowerCase().startsWith(primaryLang)) ||
      voices.find(v => v.name.toLowerCase().includes('google') && v.lang.toLowerCase().startsWith(primaryLang));
    if (voice) {
      utterance.voice = voice;
    } else {
      // No native voice installed for this language!
      // Native TTS will likely stay silent or speak garbage.
      // Force fallback to Cloud TTS.
      if (!cloudTtsEnabled && typeof window !== 'undefined') {
        try {
          await speakCloudTts(text, params.signal);
          return;
        } catch (e) {
          // ignore, will try native as absolute last resort
        }
      }
    }
  }

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
