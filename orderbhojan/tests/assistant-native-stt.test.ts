import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeatureFlags, isFeatureEnabled } from '../src/featureFlags/flags.ts';
import {
  canTransition,
  nextVoiceRuntimeState,
  shouldBlockListenForTts,
} from '../src/features/assistant/domain/voiceRuntimeState.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('native Android STT + voice runtime', () => {
  it('keeps FF_OB_AI_NATIVE_STT OFF by default', () => {
    const flags = loadFeatureFlags();
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_NATIVE_STT'), false);
  });

  it('registers Capacitor plugin OrderBhojanNativeStt in MainActivity', () => {
    const main = readFileSync(
      path.resolve(__dirname, '../android/app/src/main/java/com/bhojanos/orderbhojan/MainActivity.java'),
      'utf8',
    );
    assert.match(main, /registerPlugin\(OrderBhojanNativeSttPlugin\.class\)/);
    assert.match(main, /super\.onCreate/);
  });

  it('implements SpeechRecognizer lifecycle methods in native plugin', () => {
    const plugin = readFileSync(
      path.resolve(
        __dirname,
        '../android/app/src/main/java/com/bhojanos/orderbhojan/OrderBhojanNativeSttPlugin.java',
      ),
      'utf8',
    );
    for (const method of [
      'isAvailable',
      'getPermissionState',
      'requestPermissions',
      'startListening',
      'stopListening',
      'cancelListening',
      'permission_denied',
      'no_speech',
      'network_error',
      'recognizer_busy',
      'partialResult',
      'finalResult',
    ]) {
      assert.match(plugin, new RegExp(method));
    }
  });

  it('declares RECORD_AUDIO and RecognitionService queries', () => {
    const manifest = readFileSync(
      path.resolve(__dirname, '../android/app/src/main/AndroidManifest.xml'),
      'utf8',
    );
    assert.match(manifest, /android\.permission\.RECORD_AUDIO/);
    assert.match(manifest, /android\.speech\.RecognitionService/);
  });

  it('JS bridge exposes typed API and graceful fallback helpers', () => {
    const bridge = readFileSync(
      path.resolve(
        __dirname,
        '../src/features/assistant/infrastructure/nativeAndroidSttBridge.ts',
      ),
      'utf8',
    );
    assert.match(bridge, /registerPlugin/);
    assert.match(bridge, /captureNativeAndroidStt/);
    assert.match(bridge, /nativeSttRequestPermissions/);
    assert.match(bridge, /nativeSttCancelListening/);
    assert.match(bridge, /AI_VOICE_PERMISSION_DENIED/);
  });

  it('voice runtime blocks listen during speaking and allows barge-in', () => {
    assert.equal(shouldBlockListenForTts('speaking'), true);
    assert.equal(shouldBlockListenForTts('listening'), false);
    assert.equal(canTransition('speaking', 'BARGE_IN'), true);
    assert.equal(nextVoiceRuntimeState('speaking', 'BARGE_IN'), 'interrupted');
    assert.equal(nextVoiceRuntimeState('interrupted', 'START_LISTEN'), 'listening');
    assert.equal(nextVoiceRuntimeState('listening', 'FINAL'), 'final_transcript');
    assert.equal(nextVoiceRuntimeState('final_transcript', 'THINK'), 'thinking');
    assert.equal(nextVoiceRuntimeState('thinking', 'SPEAK'), 'speaking');
  });

  it('conversation prefers native STT then falls back to web capture', () => {
    const stt = readFileSync(
      path.resolve(__dirname, '../src/features/assistant/hooks/useVoiceStt.ts'),
      'utf8',
    );
    const conv = readFileSync(
      path.resolve(__dirname, '../src/features/assistant/ui/useAssistantConversation.ts'),
      'utf8',
    );
    const capture = readFileSync(
      path.resolve(__dirname, '../src/features/assistant/infrastructure/voiceSpeechCapture.ts'),
      'utf8',
    );
    assert.match(stt, /captureNativeAndroidStt/);
    assert.match(stt, /captureVoiceTranscript/);
    assert.match(stt, /settleMicForSpeechCapture/);
    assert.match(stt, /forceStopSpeechCapture/);
    assert.match(stt, /AI_VOICE_PERMISSION_DENIED/);
    assert.match(stt, /nativeSttCancelListening/);
    assert.match(conv, /useVoiceStt/);
    assert.match(conv, /agentMode:\s*true/);
    assert.match(conv, /forceStopSpeechCapture/);
    assert.match(conv, /sheetOpenRef/);
    assert.match(capture, /export function forceStopSpeechCapture/);
  });
});
