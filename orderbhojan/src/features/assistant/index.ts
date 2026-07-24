export type {
  AssistantErrorCode,
  ConsumerAssistChannel,
  ConsumerAssistHint,
  ConsumerAssistHintType,
  ConsumerAssistRequest,
  ConsumerAssistResult,
  VoiceTranscriptResult,
} from './types';
export type {
  CartPlanAction,
  CartPlanActionType,
  CartPlanValidateStatus,
  CartPlanValidationIssue,
  CartPlanValidationRequest,
  CartPlanValidationResult,
} from './domain/cartPlanContract';
export { AssistantApiError } from './types';
export { ConsumerAssistantEntry } from './ui/ConsumerAssistantEntry';
export { useAiAssistantFeature } from './hooks/useAiAssistantFeature';
export { useAiPostOrderFeature } from './hooks/useAiPostOrderFeature';
export { useAiPersonalizationFeature } from './hooks/useAiPersonalizationFeature';
export { useAiVoiceFeature } from './hooks/useAiVoiceFeature';
export { useAiVoiceTtsFeature } from './hooks/useAiVoiceTtsFeature';
export { useConsumerAssist } from './hooks/useConsumerAssist';
export { usePostOrderAssist } from './hooks/usePostOrderAssist';
export { useValidateCartPlan } from './hooks/useValidateCartPlan';
export { useVoiceConsumerAssist } from './hooks/useVoiceConsumerAssist';
export { useVoiceOrderingTurn } from './hooks/useVoiceOrderingTurn';
export { runConsumerAssist } from './application/runConsumerAssist';
export { runPostOrderAssist } from './application/runPostOrderAssist';
export { runValidateCartPlan } from './application/runValidateCartPlan';
export {
  runVoiceConsumerAssist,
  type VoiceConsumerAssistResult,
} from './application/runVoiceConsumerAssist';
export { runVoiceOrderingTurn } from './application/runVoiceOrderingTurn';
export { getAssistantApiClient, resetAssistantApiClientForTests } from './infrastructure/assistantApiClient';
export {
  captureVoiceTranscript,
  isVoiceCaptureAvailable,
} from './infrastructure/voiceSpeechCapture';
export {
  isSpeechSynthesisAvailable,
  speakVoiceConfirmation,
} from './infrastructure/voiceSpeechSynthesis';
export {
  assertCartPlanNonExecutable,
  CART_PLAN_ACTION_TYPES,
  normalizeCartPlanActions,
  normalizeCartPlanIssues,
  normalizeClarificationQuestions,
} from './domain/cartPlanContract';
export {
  assertVoiceOrderingTurnSafe,
  toVoiceOrderingTurn,
  type VoiceOrderingTurnResult,
} from './domain/voiceOrderingContract';
export { resolveConsumerAssistChannel } from './domain/resolveConsumerAssistChannel';
export { resolveAiCanaryCohortKey } from './domain/resolveAiCanaryCohortKey';
export { buildAiCanaryRequestAttachment } from './domain/buildAiCanaryRequestAttachment';
export { isMutationActionType, toConsumerHints } from './domain/readOnlyPolicy';
export {
  buildPostOrderContext,
  type PostOrderAssistRequest,
  type PostOrderAssistResult,
  type PostOrderContext,
  type PostOrderSnapshot,
} from './domain/postOrderAssistContract';
export {
  buildPostOrderContextFromTracking,
  mapTrackingToPostOrderSnapshot,
} from './domain/mapTrackingToPostOrderContext';
export { isPostOrderUserMessage } from './domain/isPostOrderUserMessage';
export {
  classifyPersonalizationIntent,
  isPersonalizationUserMessage,
} from './domain/isPersonalizationUserMessage';
export { buildCartAddPlansFromReorder } from './domain/buildPersonalizationCartPlans';
export { buildPersonalizationGuidance } from './domain/buildPersonalizationGuidance';
export {
  classifyPostOrderHighRiskMessage,
  isPostOrderHighRiskIntent,
  isPostOrderHighRiskMessage,
  POST_ORDER_HIGH_RISK_INTENTS,
} from './domain/postOrderHighRiskIntents';
export { buildPostOrderTriageGuidance } from './domain/buildPostOrderTriageGuidance';
export {
  assertPostOrderAssistSafe,
  isAllowedPostOrderHintTarget,
  toPostOrderHints,
} from './domain/postOrderPolicy';
export { PostOrderBootstrapProvider } from './ui/PostOrderBootstrapContext';

