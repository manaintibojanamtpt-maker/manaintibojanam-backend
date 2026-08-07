/**
 * Re-export confirm/discard/stop matchers from @bhojan/voice-core.
 * Keep a single source of truth so Android voice confirm stays in sync with triage.
 */
export {
  isConfirmCartUserMessage,
  isValidatedCartConfirmMessage,
  isDiscardCartUserMessage,
  isStopVoiceAgentMessage,
  toSpokenAssistantReply,
} from '@bhojan/voice-core';
