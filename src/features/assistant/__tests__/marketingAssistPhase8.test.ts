import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { applyMarketingHint, marketingHintLabel } from '../ui/applyMarketingHint';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assistantRoot = resolve(__dirname, '..');
const repoRoot = resolve(__dirname, '../../../..');

function read(relativeFromAssistant: string): string {
  return readFileSync(join(assistantRoot, relativeFromAssistant), 'utf8');
}

describe('assistant Phase 8 marketing UI', () => {
  it('keeps marketing AI flag OFF by default', () => {
    const features = readFileSync(join(repoRoot, 'src/config/features.ts'), 'utf8');
    assert.match(features, /aiMarketingAssistant:\s*false/);
  });

  it('MarketingAssistantRoot returns null when flag is OFF (zero DOM guard)', () => {
    const root = read('ui/MarketingAssistantRoot.tsx');
    assert.match(root, /useAiMarketingAssistantFeature/);
    assert.match(root, /if\s*\(\s*!enabled\s*\)\s*return\s*null/);
  });

  it('MarketingApp mounts assistant only via MarketingAssistantRoot', () => {
    const app = readFileSync(join(repoRoot, 'src/MarketingApp.tsx'), 'utf8');
    assert.match(app, /MarketingAssistantRoot/);
    assert.doesNotMatch(app, /AIAssistant/);
    assert.doesNotMatch(app, /\/api\/ai\/chat/);
  });

  it('does not auto-execute hints on assist response', () => {
    const chat = read('ui/useMarketingAssistantChat.ts');
    const panel = read('ui/MarketingAssistantPanel.tsx');
    const hints = read('ui/MarketingAssistantHints.tsx');
    assert.doesNotMatch(chat, /applyMarketingHint/);
    assert.doesNotMatch(panel, /applyMarketingHint/);
    assert.match(hints, /onClick=\{\(\)\s*=>\s*applyMarketingHint/);
    assert.match(hints, /Click-to-act|never auto-executed/i);
  });

  it('maps hint clicks to navigation without opening external blindly for paths', () => {
    const calls: string[] = [];
    const navigate = ((path: string) => {
      calls.push(path);
    }) as unknown as import('react-router-dom').NavigateFunction;

    const opened: string[] = [];
    const g = globalThis as { window?: { open?: (...args: unknown[]) => unknown } };
    const previousWindow = g.window;
    g.window = {
      open: (url: unknown) => {
        opened.push(String(url));
        return null;
      },
    };

    try {
      applyMarketingHint({ type: 'suggest_signup' }, navigate);
      applyMarketingHint({ type: 'suggest_contact' }, navigate);
      applyMarketingHint({ type: 'navigate', target: '/pricing' }, navigate);
      applyMarketingHint(
        { type: 'open_url', target: 'https://www.bhojanos.com/platform' },
        navigate,
      );
      assert.deepEqual(calls, ['/onboard', '/contact', '/pricing']);
      assert.deepEqual(opened, ['https://www.bhojanos.com/platform']);
      assert.equal(marketingHintLabel({ type: 'suggest_demo' }), 'Request a demo');
    } finally {
      g.window = previousWindow;
    }
  });

  it('UI sources do not call OpenRouter or legacy ai/chat or cart APIs', () => {
    const files = [
      'ui/MarketingAssistantRoot.tsx',
      'ui/MarketingAssistantPanel.tsx',
      'ui/MarketingAssistantLauncher.tsx',
      'ui/MarketingAssistantHints.tsx',
      'ui/useMarketingAssistantChat.ts',
      'ui/applyMarketingHint.ts',
    ];
    for (const file of files) {
      const src = read(file);
      assert.doesNotMatch(src, /openrouter/i);
      assert.doesNotMatch(src, /\/api\/ai\/chat/);
      assert.doesNotMatch(src, /cartStore|razorpay|placeOrder/i);
    }
  });
});
