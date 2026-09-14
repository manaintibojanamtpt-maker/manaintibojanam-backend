import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock browser storage for node test environment
const mockSessionStorage: Record<string, string> = {};
const mockLocalStorage: Record<string, string> = {};

globalThis.window = {
  sessionStorage: {
    getItem: (k: string) => mockSessionStorage[k] ?? null,
    setItem: (k: string, v: string) => { mockSessionStorage[k] = v; },
    removeItem: (k: string) => { delete mockSessionStorage[k]; },
    clear: () => { Object.keys(mockSessionStorage).forEach((k) => delete mockSessionStorage[k]); },
    length: 0,
    key: () => null,
  },
  localStorage: {
    getItem: (k: string) => mockLocalStorage[k] ?? null,
    setItem: (k: string, v: string) => { mockLocalStorage[k] = v; },
    removeItem: (k: string) => { delete mockLocalStorage[k]; },
    clear: () => { Object.keys(mockLocalStorage).forEach((k) => delete mockLocalStorage[k]); },
    length: 0,
    key: () => null,
  },
} as unknown as Window & typeof globalThis;

import {
  getVoiceSessionId,
  shouldTriggerProactiveGreeting,
  markGreetingShown,
  markGreetingSpoken,
  hasGreetingBeenSpoken,
  markGreetingDismissed,
  resolveGreetingContextType,
  resetGreetingSession,
} from '../src/features/assistant/domain/voiceFirstSession';
import {
  resolveLanguageCode,
  getGreetingMessage,
} from '../src/features/assistant/domain/greetingStrategy';
import { loadFeatureFlags } from '../src/featureFlags/flags';

describe('Phase 4D: Voice-First Experience', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    resetGreetingSession();
  });

  describe('voiceFirstSession anti-spam logic', () => {
    it('generates and persists deterministic session ID', () => {
      const id1 = getVoiceSessionId();
      assert.match(id1, /^vses_\d+_[a-z0-9]+$/);
      const id2 = getVoiceSessionId();
      assert.equal(id2, id1);
    });

    it('triggers proactive greeting only once per session', () => {
      assert.equal(shouldTriggerProactiveGreeting(), true);

      markGreetingShown();
      assert.equal(shouldTriggerProactiveGreeting(), false);
    });

    it('prevents proactive greeting if dismissed', () => {
      assert.equal(shouldTriggerProactiveGreeting(), true);

      markGreetingDismissed();
      assert.equal(shouldTriggerProactiveGreeting(), false);
    });

    it('tracks whether greeting audio has been spoken', () => {
      assert.equal(hasGreetingBeenSpoken(), false);

      markGreetingSpoken();
      assert.equal(hasGreetingBeenSpoken(), true);
    });

    it('resolves contextual greeting category based on user state', () => {
      // Cart priority
      assert.equal(
        resolveGreetingContextType({ cartItemCount: 1, restaurantName: 'Mana Inti' }),
        'returning_cart',
      );

      // Kitchen page context
      assert.equal(
        resolveGreetingContextType({ cartItemCount: 0, restaurantName: 'Mana Inti Bhojanam' }),
        'kitchen',
      );

      // First time visitor
      assert.equal(
        resolveGreetingContextType({ cartItemCount: 0 }),
        'first_visit',
      );

      // Returning visitor
      window.localStorage.setItem('ob_has_visited_before', 'true');
      assert.equal(
        resolveGreetingContextType({ cartItemCount: 0 }),
        'general_returning',
      );
    });
  });

  describe('greetingStrategy copy generation', () => {
    it('resolves languages correctly', () => {
      assert.equal(resolveLanguageCode('te'), 'te-IN');
      assert.equal(resolveLanguageCode('te-IN'), 'te-IN');
      assert.equal(resolveLanguageCode('telugu'), 'te-IN');
      assert.equal(resolveLanguageCode('hi'), 'hi-IN');
      assert.equal(resolveLanguageCode('hindi'), 'hi-IN');
      assert.equal(resolveLanguageCode('en'), 'en-IN');
      assert.equal(resolveLanguageCode(undefined), 'en-IN');
    });

    it('generates natural Telugu script for greetings', () => {
      const firstVisit = getGreetingMessage('first_visit', 'te-IN');
      assert.equal(firstVisit.language, 'te-IN');
      assert.ok(firstVisit.text.includes('నమస్కారం! ఆర్డర్‌భోజన్‌కి స్వాగతం.'));
      assert.ok(firstVisit.text.includes('మైక్ నొక్కి చెప్పండి'));

      const cartVisit = getGreetingMessage('returning_cart', 'te-IN');
      assert.ok(cartVisit.text.includes('మీ కార్ట్‌లో వంటకాలు సిద్ధంగా ఉన్నాయి.'));

      const kitchenVisit = getGreetingMessage('kitchen', 'te-IN', 'మన ఇంటి భోజనం');
      assert.ok(kitchenVisit.text.includes('మన ఇంటి భోజనంకి స్వాగతం!'));
    });

    it('generates natural Devanagari script for Hindi greetings', () => {
      const firstVisit = getGreetingMessage('first_visit', 'hi-IN');
      assert.equal(firstVisit.language, 'hi-IN');
      assert.ok(firstVisit.text.includes('नमस्ते! OrderBhojan में आपका स्वागत है।'));
      assert.ok(firstVisit.text.includes('माइक दबाकर बताएं'));

      const cartVisit = getGreetingMessage('returning_cart', 'hi-IN');
      assert.ok(cartVisit.text.includes('कार्ट में व्यंजन मौजूद हैं'));

      const kitchenVisit = getGreetingMessage('kitchen', 'hi-IN', 'माँ की रसोई');
      assert.ok(kitchenVisit.text.includes('माँ की रसोई में आपका स्वागत है!'));
    });

    it('generates welcoming English phrasing', () => {
      const firstVisit = getGreetingMessage('first_visit', 'en-IN');
      assert.equal(firstVisit.language, 'en-IN');
      assert.ok(firstVisit.text.includes('Welcome to OrderBhojan!'));
      assert.ok(firstVisit.text.includes('Tap the microphone and tell me what you would like to eat'));

      const cartVisit = getGreetingMessage('returning_cart', 'en-IN');
      assert.ok(cartVisit.text.includes('items waiting in your cart'));

      const kitchenVisit = getGreetingMessage('kitchen', 'en-IN', 'Mana Inti');
      assert.ok(kitchenVisit.text.includes('Welcome to Mana Inti!'));
    });
  });

  describe('Component and UI wiring integrity', () => {
    it('HomeVoiceHeroCard triggers ob-voice-agent-open and provides multilingual chips', () => {
      const cardSrc = readFileSync(
        path.resolve(__dirname, '../src/features/assistant/ui/HomeVoiceHeroCard.tsx'),
        'utf8',
      );
      assert.ok(cardSrc.includes('ob-voice-agent-open'));
      assert.ok(cardSrc.includes('HomeVoiceHeroCard'));
      assert.ok(cardSrc.includes('2 Masala Dosa add cheyi'));
    });

    it('VoiceFirstWelcomeToast provides Tap to speak and Tap to hear fallback', () => {
      const toastSrc = readFileSync(
        path.resolve(__dirname, '../src/features/assistant/ui/VoiceFirstWelcomeToast.tsx'),
        'utf8',
      );
      assert.ok(toastSrc.includes('VoiceFirstWelcomeToast'));
      assert.ok(toastSrc.includes('Tap to speak'));
      assert.ok(toastSrc.includes('Tap to hear'));
      assert.ok(toastSrc.includes('markGreetingDismissed'));
    });

    it('ConsumerAssistantShell integrates VoiceFirstWelcomeToast without disrupting canonical FAB', () => {
      const shellSrc = readFileSync(
        path.resolve(__dirname, '../src/features/assistant/ui/ConsumerAssistantShell.tsx'),
        'utf8',
      );
      assert.ok(shellSrc.includes('VoiceFirstWelcomeToast'));
      assert.ok(shellSrc.includes('ConsumerAssistantFab'));
      assert.ok(shellSrc.includes('startVoiceAgent'));
    });
  });
});
