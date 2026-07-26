import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isConfirmCartUserMessage,
  isDiscardCartUserMessage,
  isStopVoiceAgentMessage,
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
