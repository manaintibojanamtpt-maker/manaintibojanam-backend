import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  buildPostOrderSystemAddon,
  parsePostOrderAssistContext,
} from '../postOrderAssistContracts.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

describe('AI gateway Phase 10 post-order contracts', () => {
  it('parses nested and flat post-order context', () => {
    const nested = parsePostOrderAssistContext({
      orderContext: {
        orderId: ' ord_123 ',
        snapshot: {
          orderNumber: 'OB-9',
          status: 'preparing',
          etaMinutes: { min: 20, max: 35 },
        },
      },
    });
    assert.equal(nested.used, true);
    assert.equal(nested.context?.orderId, 'ord_123');
    assert.equal(nested.context?.snapshot?.status, 'preparing');
    assert.deepEqual(nested.context?.snapshot?.etaMinutes, { min: 20, max: 35 });

    const flat = parsePostOrderAssistContext({ orderId: 'x1', guestPhone: '+91 99999 99999' });
    assert.equal(flat.used, true);
    assert.equal(flat.context?.guestPhone, '+91 99999 99999');

    const empty = parsePostOrderAssistContext({ foo: 'bar' });
    assert.equal(empty.used, false);
    assert.equal(empty.context, null);
  });

  it('builds read-only post-order system addon without mutation claims', () => {
    const addon = buildPostOrderSystemAddon({
      orderId: 'ord_1',
      snapshot: { status: 'out_for_delivery', orderNumber: 'OB-1' },
    });
    assert.match(addon, /Post-order help mode/i);
    assert.match(addon, /MUST NOT cancel/i);
    assert.match(addon, /ord_1/);
    assert.doesNotMatch(addon, /place order|add to cart/i);
  });

  it('gateway status advertises post-order contracts (phase ≥ 10)', () => {
    const src = readFileSync(join(repoRoot, 'backend-lib/ai/registerAiGatewayRoutes.ts'), 'utf8');
    assert.match(src, /phase:\s*(?:1[0-9]|[2-9]\d+)/);
    assert.match(src, /postOrderAssistHooks:\s*true/);
    assert.match(src, /postOrderContextParsing:\s*true/);
    assert.match(src, /parsePostOrderAssistContext/);
    assert.match(src, /buildPostOrderSystemAddon/);
  });

  it('consumer system prompt mentions post-order guidance', () => {
    const src = readFileSync(join(repoRoot, 'backend-lib/ai/assistantModeRouter.ts'), 'utf8');
    assert.match(src, /post-order|order status/i);
  });
});
