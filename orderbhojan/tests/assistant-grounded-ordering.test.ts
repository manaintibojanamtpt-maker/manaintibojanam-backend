import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseCartAddUserMessage } from '../src/features/assistant/domain/isCartAddUserMessage.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

describe('assistant grounded ordering + cart-add intent', () => {
  it('parses add-to-cart utterances with quantity', () => {
    assert.deepEqual(parseCartAddUserMessage('add 2 masala dosa to cart'), {
      quantity: 2,
      itemName: 'masala dosa',
    });
    assert.deepEqual(parseCartAddUserMessage('Add paneer tikka to cart'), {
      quantity: 1,
      itemName: 'paneer tikka',
    });
    assert.deepEqual(
      parseCartAddUserMessage('Add two quantity Masala Dosa from Inti bhojanam'),
      {
        quantity: 2,
        itemName: 'Masala Dosa',
        kitchenHint: 'Inti bhojanam',
      },
    );
    assert.deepEqual(
      parseCartAddUserMessage('add 2 quantity masla dosa feom inti bojanam'),
      {
        quantity: 2,
        itemName: 'masala dosa',
        kitchenHint: 'inti bhojanam',
      },
    );
    assert.deepEqual(
      parseCartAddUserMessage('Rendu Masala Dosa antibody'),
      {
        quantity: 2,
        itemName: 'Masala Dosa',
        kitchenHint: 'inti bhojanam',
      },
    );
    const te = parseCartAddUserMessage('రెండు మసాలా దోశ ఇంటి భోజనం నుండి');
    assert.ok(te);
    assert.equal(te?.quantity, 2);
    assert.match(te?.itemName ?? '', /మసాలా|masala/i);
    assert.match(te?.kitchenHint ?? '', /inti|ఇంటి/i);
    assert.equal(parseCartAddUserMessage('what is popular?'), null);
  });

  it('conversation grounds kitchen via marketplace before assist', () => {
    const conv = readFileSync(
      join(root, 'src/features/assistant/ui/useAssistantConversation.ts'),
      'utf8',
    );
    assert.match(conv, /buildOrderingAssistContext/);
    assert.match(conv, /groundVoiceOrderingContext/);
    assert.match(conv, /orderingContext/);
    assert.match(conv, /parseCartAddUserMessage/);
    assert.match(conv, /knownRestaurantSlug/);
  });

  it('API client posts orderingContext nested under context', () => {
    const client = readFileSync(
      join(root, 'src/features/assistant/infrastructure/assistantApiClient.ts'),
      'utf8',
    );
    assert.match(client, /orderingContext/);
  });

  it('keeps confirm-to-apply as the only cart mutation path', () => {
    const apply = readFileSync(
      join(root, 'src/features/cart/domain/applyConfirmedCartPlan.ts'),
      'utf8',
    );
    assert.match(apply, /userConfirmed:\s*true/);
  });
});
