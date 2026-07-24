import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeatureFlags, isFeatureEnabled } from '../src/featureFlags/flags';
import {
  fnv1aHex32,
  resolveAiCanaryCohortKey,
} from '../src/features/assistant/domain/resolveAiCanaryCohortKey';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

describe('assistant Phase 20 canary headers', () => {
  it('keeps FF_OB_AI_CANARY_HEADERS OFF by default', () => {
    const flags = loadFeatureFlags();
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_CANARY_HEADERS'), false);
  });

  it('resolves deterministic hashed cohort keys without PII plaintext', () => {
    const a = resolveAiCanaryCohortKey({ deviceId: 'ob-web-device-1' });
    const b = resolveAiCanaryCohortKey({ deviceId: 'ob-web-device-1' });
    const c = resolveAiCanaryCohortKey({ deviceId: 'ob-web-device-2' });
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.match(a, /^ob-cohort-[0-9a-f]{8}$/);
    assert.equal(a.includes('ob-web-device-1'), false);

    const withUser = resolveAiCanaryCohortKey({
      deviceId: 'ob-web-device-1',
      userId: 'uid-abc',
    });
    assert.notEqual(withUser, a);
    assert.equal(withUser.includes('uid-abc'), false);
  });

  it('fnv1aHex32 is stable', () => {
    assert.equal(fnv1aHex32('hello'), fnv1aHex32('hello'));
    assert.equal(fnv1aHex32('hello').length, 8);
  });

  it('client attaches canary only via flag-gated helper; no UI surface', () => {
    const client = readFileSync(
      path.join(root, 'src/features/assistant/infrastructure/assistantApiClient.ts'),
      'utf8',
    );
    const attachment = readFileSync(
      path.join(root, 'src/features/assistant/domain/buildAiCanaryRequestAttachment.ts'),
      'utf8',
    );
    const uiEntry = readFileSync(
      path.join(root, 'src/features/assistant/ui/ConsumerAssistantEntry.tsx'),
      'utf8',
    );

    assert.match(attachment, /FF_OB_AI_CANARY_HEADERS/);
    assert.match(client, /withCanaryBody|buildAiCanaryRequestAttachment/);
    assert.match(client, /AI_CANARY_EXCLUDED|AI_CANARY_HEALTH_GATE/);
    assert.doesNotMatch(uiEntry, /CANARY_HEADERS|canary cohort/i);
  });
});
