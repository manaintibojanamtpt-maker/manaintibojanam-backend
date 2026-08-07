export { createOrderBhojanVoiceAdapter } from './adapters/orderBhojanVoiceAdapter';
export type {
  OrderBhojanVoiceAdapter,
  OrderBhojanVoiceAdapterDeps,
} from './adapters/orderBhojanVoiceAdapter';

export {
  runVoiceCoreTurn,
  type VoiceCoreTurnResult,
} from './application/runVoiceCoreTurn';

export {
  pendingValidationToConfirmation,
  pendingPlanIdFromValidation,
  syncConfirmationFromPending,
  clearVoiceConfirmation,
  foldVoiceConfirmationUtterance,
  idleOrderingTask,
  shouldHandleWithVoiceCorePreLlm,
} from './application/voiceCoreBridge';

export {
  validateEnrichedCartAdd,
  isVoiceCoreConfirmAddReady,
  type EnrichedCartAddValidateDeps,
  type EnrichedCartAddResult,
} from './application/enrichedCartAddValidate';



export {
  recordVoiceCoreDualRun,
  type VoiceCoreDualRunPath,
  type VoiceCoreDualRunOutcome,
} from './application/voiceCoreDualRunTelemetry';

export {
  evaluateVoiceCoreConfirmAddRollout,
  isVoiceCoreConfirmAddEnabledForClient,
  getVoiceCoreConfirmAddRolloutDecision,
  stickyBucket0to99,
  type VoiceCoreConfirmAddRolloutDecision,
} from './application/voiceCoreConfirmAddRollout';

export {
  createVoiceSession,
  triageVoiceUtterance,
  initialConfirmationSnapshot,
  reduceConfirmation,
  canApplyConfirmedChange,
  blockPlaceOrderWithoutConfirm,
  emitVoiceTelemetry,
  type VoiceSession,
  type ConfirmationSnapshot,
  type TriageDecision,
  type VoicePlatformAdapter,
  type OrderingTaskSnapshot,
} from '@bhojan/voice-core';
