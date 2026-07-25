import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeatureFlags, isFeatureEnabled } from '../src/featureFlags/flags';
import { runVoiceOrderingTurn } from '../src/features/assistant/application/runVoiceOrderingTurn';
import {
  assertVoiceOrderingTurnSafe,
  toVoiceOrderingTurn,
} from '../src/features/assistant/domain/voiceOrderingContract';
import { AssistantApiError } from '../src/features/assistant/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assistantRoot = path.resolve(__dirname, '../src/features/assistant');

function readAssistantSource(relativePath: string): string {
  return readFileSync(path.join(assistantRoot, relativePath), 'utf8');
}

function mockRecognition(transcript: string) {
  return () => ({
    lang: '',
    interimResults: false,
    maxAlternatives: 1,
    continuous: false,
    onresult: null as null | ((event: unknown) => void),
    onerror: null as null | ((event: unknown) => void),
    onend: null as null | (() => void),
    start() {
      queueMicrotask(() => {
        this.onresult?.({
          results: [[{ transcript, confidence: 0.9 }]],
        });
      });
    },
    stop() {},
    abort() {},
  });
}

describe('assistant Phase 6 voice ordering turn', () => {
  it('keeps AI voice and TTS flags OFF by default', () => {
    const flags = loadFeatureFlags();
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_ASSISTANT'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_VOICE'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_VOICE_TTS'), false);
  });

  it('maps transcript + assist into structured intent without side effects', () => {
    const turn = toVoiceOrderingTurn({
      confirmationSpoken: false,
      voice: {
        transcript: 'find biryani',
        source: 'web_speech',
        platform: 'android',
      },
      assist: {
        schemaVersion: '3.0',
        conversationId: 'c1',
        channel: 'orderbhojan_android',
        reply: 'Here are biryani kitchens nearby.',
        intent: 'search_menu',
        safetyBlocked: false,
        suggestedHints: [{ type: 'navigate', target: '/search' }],
        proposedCartActions: [],
        sideEffects: [],
        mutatedState: false,
      },
    });
    assert.equal(turn.schemaVersion, '6.0');
    assert.equal(turn.intent, 'search_menu');
    assert.equal(turn.transcript, 'find biryani');
    assert.equal(turn.confirmationSpoken, false);
    assert.deepEqual(turn.sideEffects, []);
    assert.equal(turn.mutatedState, false);
    assert.doesNotThrow(() => assertVoiceOrderingTurnSafe(turn));
  });

  it('does not capture speech or speak when voice flag is OFF', async () => {
    let spoke = false;
    await assert.rejects(
      () =>
        runVoiceOrderingTurn({
          assistantEnabled: true,
          voiceEnabled: false,
          ttsEnabled: true,
          getIdToken: async () => null,
          createRecognition: mockRecognition('hello'),
          createSynthesis: () => {
            spoke = true;
            return null;
          },
          client: {
            consumerAssist: async () => {
              throw new Error('no assist');
            },
          },
        }),
      (err: unknown) => err instanceof AssistantApiError && err.code === 'AI_VOICE_DISABLED',
    );
    assert.equal(spoke, false);
  });

  it('runs STT → intent and optionally speaks confirmation when TTS enabled', async () => {
    const spoken: string[] = [];
    const turn = await runVoiceOrderingTurn({
      assistantEnabled: true,
      voiceEnabled: true,
      ttsEnabled: true,
      isNative: () => true,
      getIdToken: async () => null,
      createRecognition: mockRecognition('  recommend dinner  '),
      createSynthesis: () => ({
        speaking: false,
        cancel() {},
        speak(utterance) {
          spoken.push(utterance.text);
          queueMicrotask(() => utterance.onend?.());
        },
      }),
      createUtterance: (text) => ({
        text,
        lang: '',
        rate: 1,
        onend: null,
        onerror: null,
      }),
      client: {
        consumerAssist: async () => ({
          schemaVersion: '3.0',
          conversationId: 'c2',
          channel: 'orderbhojan_android',
          reply: 'Try a mild thali tonight.',
          intent: 'recommend_meals',
          safetyBlocked: false,
          suggestedHints: [{ type: 'none' }],
          proposedCartActions: [],
          sideEffects: [],
          mutatedState: false,
        }),
      },
    });

    assert.equal(turn.transcript, 'recommend dinner');
    assert.equal(turn.intent, 'recommend_meals');
    assert.equal(turn.confirmationSpoken, true);
    assert.deepEqual(spoken, ['Try a mild thali tonight.']);
    assert.equal(turn.mutatedState, false);
  });

  it('skips TTS when FF_OB_AI_VOICE_TTS is OFF', async () => {
    let synthCreated = false;
    const turn = await runVoiceOrderingTurn({
      assistantEnabled: true,
      voiceEnabled: true,
      ttsEnabled: false,
      getIdToken: async () => null,
      createRecognition: mockRecognition('track my order'),
      createSynthesis: () => {
        synthCreated = true;
        return null;
      },
      client: {
        consumerAssist: async () => ({
          schemaVersion: '3.0',
          conversationId: 'c3',
          channel: 'orderbhojan_web',
          reply: 'Open Orders to see tracking.',
          intent: 'order_status_help',
          safetyBlocked: false,
          suggestedHints: [{ type: 'none' }],
          proposedCartActions: [],
          sideEffects: [],
          mutatedState: false,
        }),
      },
    });
    assert.equal(turn.confirmationSpoken, false);
    assert.equal(synthCreated, false);
    assert.equal(turn.intent, 'order_status_help');
  });

  it('Phase 6 sources do not import cart or checkout modules', () => {
    const files = [
      'application/runVoiceOrderingTurn.ts',
      'domain/voiceOrderingContract.ts',
      'hooks/useAiVoiceTtsFeature.ts',
      'hooks/useVoiceOrderingTurn.ts',
      'infrastructure/voiceSpeechSynthesis.ts',
    ];
    for (const file of files) {
      const src = readAssistantSource(file);
      assert.equal(/from ['"]@\/features\/cart/.test(src), false, `${file} imports cart`);
      assert.equal(/from ['"]@\/features\/checkout/.test(src), false, `${file} imports checkout`);
      assert.equal(/cartStore|useCheckoutFlow|razorpayCheckout/.test(src), false, `${file} cart refs`);
    }
  });

  it('does not mount voice ordering UI in MarketplaceLayout', () => {
    const layout = readFileSync(
      path.resolve(__dirname, '../src/shared/layouts/MarketplaceLayout.tsx'),
      'utf8',
    );
    assert.equal(/useVoiceOrderingTurn|FF_OB_AI_VOICE_TTS|voiceSpeechSynthesis/i.test(layout), false);
  });
});
