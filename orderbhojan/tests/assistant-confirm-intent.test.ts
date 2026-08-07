import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isConfirmCartUserMessage,
  isDiscardCartUserMessage,
  isStopVoiceAgentMessage,
  isValidatedCartConfirmMessage,
  toSpokenAssistantReply,
} from '../src/features/assistant/domain/isConfirmCartUserMessage';

describe('assistant confirm / voice-agent intents', () => {
  it('recognizes confirm and discard phrases', () => {
    assert.equal(isConfirmCartUserMessage('confirm'), true);
    assert.equal(isConfirmCartUserMessage('yes'), true);
    assert.equal(isConfirmCartUserMessage('add it'), true);
    assert.equal(isDiscardCartUserMessage('discard'), true);
    assert.equal(isDiscardCartUserMessage('no'), true);
    assert.equal(isConfirmCartUserMessage('masala dosa is available'), false);
  });

  it('accepts natural confirm-and-add phrases when a validated plan is waiting', () => {
    const pending = { status: 'validated', valid: true } as const;
    assert.equal(isValidatedCartConfirmMessage('confirm and add to cart', pending), true);
    assert.equal(isValidatedCartConfirmMessage('confirm Andhra add to cart', pending), true);
    assert.equal(isValidatedCartConfirmMessage('please add it to cart', pending), true);
    assert.equal(isValidatedCartConfirmMessage('add to cart', pending), true);
    assert.equal(isValidatedCartConfirmMessage('yes confirm add', pending), true);
    // New dish order must not steal confirm
    assert.equal(isValidatedCartConfirmMessage('add 2 chicken biryani', pending), false);
    assert.equal(isValidatedCartConfirmMessage('masala dosa please', pending), false);
  });

  it('accepts ASR-repeated confirm tokens without falling through to chat', () => {
    assert.equal(isConfirmCartUserMessage('Confirm Confirm'), true);
    assert.equal(isConfirmCartUserMessage('confirm confirm confirm'), true);
    assert.equal(isConfirmCartUserMessage('yes confirm'), true);
    assert.equal(isConfirmCartUserMessage('ok ok'), true);
    assert.equal(
      isValidatedCartConfirmMessage('Confirm Confirm', {
        status: 'validated',
        valid: true,
      }),
      true,
    );
  });

  it('only treats yes as cart confirm when plan is validated', () => {
    assert.equal(
      isValidatedCartConfirmMessage('yes', { status: 'needs_clarification', valid: false }),
      false,
    );
    assert.equal(
      isValidatedCartConfirmMessage('yes', { status: 'validated', valid: true }),
      true,
    );
  });

  it('recognizes stop-agent phrases without discarding cart on bare stop', () => {
    assert.equal(isStopVoiceAgentMessage('stop listening'), true);
    assert.equal(isStopVoiceAgentMessage('stop'), true);
    assert.equal(isStopVoiceAgentMessage('goodbye'), true);
    assert.equal(isStopVoiceAgentMessage('add idli'), false);
    assert.equal(isDiscardCartUserMessage('stop'), false);
  });

  it('shortens spoken replies', () => {
    const spoken = toSpokenAssistantReply(
      'First sentence here. Second sentence follows. Third should be cut.',
    );
    assert.match(spoken, /First sentence/);
    assert.match(spoken, /Second sentence/);
    assert.equal(spoken.includes('Third'), false);
  });
});
