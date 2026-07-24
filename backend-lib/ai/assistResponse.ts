import type { AssistantIntent } from './intentTaxonomy.js';
import type { AiStructuredAssistResult } from './structuredOutput.js';
import type { AssistantCapability, AssistantChannel, AssistantMode } from './types.js';

export interface AiAssistResponse {
  readonly success: true;
  readonly schemaVersion: '2.0';
  readonly mode: AssistantMode;
  readonly channel: AssistantChannel;
  readonly conversationId: string;
  readonly reply: string;
  readonly intent: AssistantIntent;
  readonly structured: AiStructuredAssistResult;
  readonly allowedCapabilities: readonly AssistantCapability[];
  readonly sideEffects: [];
  readonly provider: {
    readonly name: 'openrouter';
    readonly model: string;
  };
  readonly meta: {
    readonly gatewayEnabled: true;
    readonly phase: 3;
    readonly mutatedState: false;
    readonly structuredSource: 'model_json' | 'heuristic_wrap';
    readonly safetyAllowed: boolean;
    readonly readOnlyConsumer: boolean;
  };
}
