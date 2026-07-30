export {
  createVoiceSession,
  type VoiceSession,
  type VoiceProduct,
  type VoiceChannel,
} from './session/VoiceSession.js';

export {
  canTransition,
  nextVoiceRuntimeState,
  shouldBlockListenForTts,
  type VoiceRuntimeState,
  type VoiceRuntimeEvent,
} from './session/VoiceRuntimeFsm.js';

export {
  deriveTaskStateFromValidation,
  isExplicitNewOrderOrCancel,
  shouldRetainPendingCartPlan,
  bumpClarification,
  shouldEscalateForClarificationLoop,
  MAX_VOICE_CLARIFICATIONS,
  type OrderingTaskState,
  type OrderingTaskSnapshot,
} from './session/OrderingTaskFsm.js';

export {
  isConfirmCartUserMessage,
  isValidatedCartConfirmMessage,
  isDiscardCartUserMessage,
  isStopVoiceAgentMessage,
  toSpokenAssistantReply,
} from './confirmation/confirmUtterances.js';

export {
  initialConfirmationSnapshot,
  reduceConfirmation,
  canApplyConfirmedChange,
  type PendingCartPlan,
  type ConfirmationPhase,
  type ConfirmationSnapshot,
  type ConfirmationEvent,
} from './confirmation/ConfirmationStateMachine.js';

export {
  MUTATING_VOICE_TOOLS,
  isMutatingVoiceTool,
  createToolCallId,
  blockPlaceOrderWithoutConfirm,
  type VoiceToolName,
  type VoiceToolCall,
  type VoiceToolResult,
  type VoiceToolSuccess,
  type VoiceToolFailure,
  type FindMenuItemsArgs,
  type AddItemToCartArgs,
  type GetCartSummaryArgs,
  type PlaceOrderArgs,
  type EscalateArgs,
} from './tools/contracts.js';

export {
  triageVoiceUtterance,
  type TriageDecision,
} from './orchestrator/triageOrchestrator.js';

export type {
  VoicePlatformAdapter,
  CartSummary,
  CartSummaryLine,
  MenuItemMatch,
} from './adapters/VoicePlatformAdapter.js';

export {
  emitVoiceTelemetry,
  setVoiceTelemetrySink,
  getVoiceTelemetryCounters,
  resetVoiceTelemetryCountersForTests,
  type VoiceTelemetryEvent,
  type VoiceTelemetrySink,
} from './telemetry/voiceTelemetry.js';
