import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeatureFlags, isFeatureEnabled } from '../src/featureFlags/flags';
import { resolveConsumerAssistChannel } from '../src/features/assistant/domain/resolveConsumerAssistChannel';
import { runVoiceConsumerAssist } from '../src/features/assistant/application/runVoiceConsumerAssist';
import { captureVoiceTranscript } from '../src/features/assistant/infrastructure/voiceSpeechCapture';
import { AssistantApiError } from '../src/features/assistant/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assistantRoot = path.resolve(__dirname, '../src/features/assistant');

function readAssistantSource(relativePath: string): string {
  return readFileSync(path.join(assistantRoot, relativePath), 'utf8');
}

describe('assistant Phase 5 Android parity + voice hooks', () => {
  it('keeps FF_OB_AI_ASSISTANT and FF_OB_AI_VOICE OFF by default', () => {
    const flags = loadFeatureFlags();
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_ASSISTANT'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_VOICE'), false);
  });

  it('allows microphone for self in hosting Permissions-Policy (fixes not-allowed)', () => {
    const firebase = readFileSync(path.resolve(__dirname, '../../firebase.json'), 'utf8');
    const preset = readFileSync(
      path.resolve(__dirname, '../../scripts/firebase/spa-hosting-preset.json'),
      'utf8',
    );
    assert.match(firebase, /microphone=\(self\)/);
    assert.doesNotMatch(firebase, /microphone=\(\)/);
    assert.match(preset, /microphone=\(self\)/);
  });

  it('declares RECORD_AUDIO for Capacitor WebView speech capture', () => {
    const manifest = readFileSync(
      path.resolve(__dirname, '../android/app/src/main/AndroidManifest.xml'),
      'utf8',
    );
    assert.match(manifest, /android\.permission\.RECORD_AUDIO/);
  });

  it('resolves Android channel when native platform is true', () => {
    assert.equal(resolveConsumerAssistChannel(() => true), 'orderbhojan_android');
    assert.equal(resolveConsumerAssistChannel(() => false), 'orderbhojan_web');
  });

  it('does not start mic or network when voice flag is OFF', async () => {
    let recognitionCreated = false;
    let assistCalled = false;
    await assert.rejects(
      () =>
        runVoiceConsumerAssist({
          assistantEnabled: true,
          voiceEnabled: false,
          getIdToken: async () => 'token',
          createRecognition: () => {
            recognitionCreated = true;
            return null;
          },
          client: {
            consumerAssist: async () => {
              assistCalled = true;
              throw new Error('should not call assist');
            },
          },
        }),
      (err: unknown) => err instanceof AssistantApiError && err.code === 'AI_VOICE_DISABLED',
    );
    assert.equal(recognitionCreated, false);
    assert.equal(assistCalled, false);
  });

  it('does not start mic or network when assistant flag is OFF', async () => {
    let recognitionCreated = false;
    let assistCalled = false;
    await assert.rejects(
      () =>
        runVoiceConsumerAssist({
          assistantEnabled: false,
          voiceEnabled: true,
          getIdToken: async () => 'token',
          createRecognition: () => {
            recognitionCreated = true;
            return null;
          },
          client: {
            consumerAssist: async () => {
              assistCalled = true;
              throw new Error('should not call assist');
            },
          },
        }),
      (err: unknown) => err instanceof AssistantApiError && err.code === 'AI_FEATURE_DISABLED',
    );
    assert.equal(recognitionCreated, false);
    assert.equal(assistCalled, false);
  });

  it('captures transcript via injectable recognition and calls assist (no cart apply)', async () => {
    const assistMessages: string[] = [];
    const result = await runVoiceConsumerAssist({
      assistantEnabled: true,
      voiceEnabled: true,
      isNative: () => true,
      getIdToken: async () => null,
      createRecognition: () => {
        const recognition = {
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
                results: [[{ transcript: ' show dosa near me ', confidence: 0.9 }]],
              });
            });
          },
          stop() {},
          abort() {},
        };
        return recognition;
      },
      client: {
        consumerAssist: async (req) => {
          assistMessages.push(req.message);
          return {
            schemaVersion: '3.0',
            conversationId: 'c1',
            channel: 'orderbhojan_android',
            reply: 'Here are dosa options.',
            intent: 'search_menu',
            safetyBlocked: false,
            suggestedHints: [{ type: 'none' }],
            proposedCartActions: [],
            sideEffects: [],
            mutatedState: false,
          };
        },
      },
    });

    assert.equal(result.voice.transcript, 'show dosa near me');
    assert.equal(result.voice.platform, 'android');
    assert.deepEqual(assistMessages, ['show dosa near me']);
    assert.equal(result.assist.channel, 'orderbhojan_android');
    assert.deepEqual(result.assist.sideEffects, []);
    assert.equal(result.assist.mutatedState, false);
  });

  it('preserves scheduleVoiceFeedback on Android channel assist result (no cart apply)', async () => {
    const result = await runVoiceConsumerAssist({
      assistantEnabled: true,
      voiceEnabled: true,
      isNative: () => true,
      getIdToken: async () => null,
      createRecognition: () => {
        const recognition = {
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
                results: [[{ transcript: ' schedule later ', confidence: 0.9 }]],
              });
            });
          },
          stop() {},
          abort() {},
        };
        return recognition;
      },
      client: {
        consumerAssist: async () => ({
          schemaVersion: '3.0' as const,
          conversationId: 'c-sched',
          channel: 'orderbhojan_android' as const,
          reply: 'Please say a clear time — now, 8 PM, or tomorrow lunch.',
          intent: 'cart_question',
          safetyBlocked: false,
          suggestedHints: [{ type: 'none' as const }],
          proposedCartActions: [],
          scheduleVoiceFeedback: {
            kind: 'clarify' as const,
            reason: 'AmbiguousDeliveryTime',
            message: 'Please say a clear time — now, 8 PM, or tomorrow lunch.',
          },
          sideEffects: [] as const,
          mutatedState: false as const,
        }),
      },
    });

    assert.equal(result.assist.channel, 'orderbhojan_android');
    assert.equal(result.assist.scheduleVoiceFeedback?.kind, 'clarify');
    assert.equal(result.assist.scheduleVoiceFeedback?.reason, 'AmbiguousDeliveryTime');
    assert.equal(result.assist.proposedScheduleActions, undefined);
    assert.equal(result.assist.mutatedState, false);
  });

  it('reports unsupported when SpeechRecognition is missing', async () => {
    await assert.rejects(
      () =>
        captureVoiceTranscript({
          createRecognition: () => null,
        }),
      (err: unknown) => err instanceof AssistantApiError && err.code === 'AI_VOICE_UNSUPPORTED',
    );
  });

  it('assistant Phase 5 sources do not import cart or checkout modules', () => {
    const files = [
      'application/runVoiceConsumerAssist.ts',
      'domain/resolveConsumerAssistChannel.ts',
      'hooks/useAiVoiceFeature.ts',
      'hooks/useVoiceConsumerAssist.ts',
      'infrastructure/voiceSpeechCapture.ts',
      'infrastructure/assistantApiClient.ts',
      'index.ts',
    ];
    for (const file of files) {
      const src = readAssistantSource(file);
      assert.equal(/from ['"]@\/features\/cart/.test(src), false, `${file} imports cart`);
      assert.equal(/from ['"]@\/features\/checkout/.test(src), false, `${file} imports checkout`);
      assert.equal(/cartStore|useCheckoutFlow|razorpayCheckout/.test(src), false, `${file} cart/checkout refs`);
    }
  });

  it('does not mount voice/assistant UI in MarketplaceLayout', () => {
    const layout = readFileSync(
      path.resolve(__dirname, '../src/shared/layouts/MarketplaceLayout.tsx'),
      'utf8',
    );
    assert.equal(
      /useVoiceConsumerAssist|useConsumerAssist|FF_OB_AI_VOICE|voiceSpeechCapture/i.test(layout),
      false,
    );
  });
});
