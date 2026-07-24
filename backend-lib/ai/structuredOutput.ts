import type { AssistantChannel, AssistantMode } from './types.js';
import {
  classifyIntentHeuristic,
  isIntentAllowedForMode,
  type AssistantIntent,
} from './intentTaxonomy.js';

export const AI_STRUCTURED_SCHEMA_VERSION = '2.0' as const;

/** Planned actions only — never executed by the gateway in Phase 2. */
export const AI_PROPOSED_ACTION_TYPES = [
  'none',
  'navigate',
  'open_url',
  'suggest_contact',
  'suggest_signup',
  'suggest_demo',
  'cart_add_plan',
  'cart_update_plan',
  'cart_remove_plan',
  'place_order',
] as const;

export type AiProposedActionType = (typeof AI_PROPOSED_ACTION_TYPES)[number];

export interface AiProposedAction {
  readonly type: AiProposedActionType;
  readonly requiresConfirmation: boolean;
  readonly executable: false;
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly reason?: string;
}

export interface AiStructuredAssistResult {
  readonly schemaVersion: typeof AI_STRUCTURED_SCHEMA_VERSION;
  readonly mode: AssistantMode;
  readonly channel: AssistantChannel;
  readonly intent: AssistantIntent;
  readonly reply: string;
  readonly confidence: number;
  readonly proposedActions: readonly AiProposedAction[];
  readonly safety: {
    readonly blocked: boolean;
    readonly reasons: readonly string[];
  };
}

export interface ParseStructuredResult {
  readonly ok: true;
  readonly value: AiStructuredAssistResult;
  readonly source: 'model_json' | 'heuristic_wrap';
}

export interface ParseStructuredFailure {
  readonly ok: false;
  readonly error: string;
}

function clampConfidence(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function isProposedActionType(value: unknown): value is AiProposedActionType {
  return typeof value === 'string' && (AI_PROPOSED_ACTION_TYPES as readonly string[]).includes(value);
}

/**
 * Normalize a proposed action into a non-executable plan object.
 * Mutation-class actions always requireConfirmation and executable=false.
 */
export function normalizeProposedAction(raw: unknown): AiProposedAction | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (!isProposedActionType(obj.type)) return null;

  const mutationTypes: AiProposedActionType[] = [
    'cart_add_plan',
    'cart_update_plan',
    'cart_remove_plan',
    'place_order',
  ];
  const requiresConfirmation =
    mutationTypes.includes(obj.type) ||
    obj.requiresConfirmation === true ||
    obj.type !== 'none';

  const payload =
    obj.payload && typeof obj.payload === 'object' && !Array.isArray(obj.payload)
      ? (obj.payload as Record<string, unknown>)
      : undefined;

  return {
    type: obj.type,
    requiresConfirmation,
    executable: false,
    ...(payload ? { payload } : {}),
    ...(typeof obj.reason === 'string' ? { reason: obj.reason.slice(0, 500) } : {}),
  };
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.includes('{')) return null;
  try {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function buildHeuristicStructuredResult(params: {
  readonly mode: AssistantMode;
  readonly channel: AssistantChannel;
  readonly message: string;
  readonly reply: string;
}): AiStructuredAssistResult {
  const intent = classifyIntentHeuristic(params.mode, params.message);
  return {
    schemaVersion: AI_STRUCTURED_SCHEMA_VERSION,
    mode: params.mode,
    channel: params.channel,
    intent,
    reply: params.reply,
    confidence: 0.55,
    proposedActions: [
      {
        type: 'none',
        requiresConfirmation: false,
        executable: false,
      },
    ],
    safety: {
      blocked: intent === 'out_of_scope',
      reasons: intent === 'out_of_scope' ? ['intent_out_of_scope_for_mode'] : [],
    },
  };
}

/**
 * Parse model text into the shared structured assist schema.
 * Falls back to heuristic wrap when JSON is absent or invalid.
 */
export function parseStructuredAssistOutput(params: {
  readonly mode: AssistantMode;
  readonly channel: AssistantChannel;
  readonly message: string;
  readonly modelText: string;
}): ParseStructuredResult {
  const json = extractJsonObject(params.modelText);
  if (!json) {
    return {
      ok: true,
      source: 'heuristic_wrap',
      value: buildHeuristicStructuredResult({
        mode: params.mode,
        channel: params.channel,
        message: params.message,
        reply: params.modelText.trim(),
      }),
    };
  }

  const reply =
    typeof json.reply === 'string' && json.reply.trim()
      ? json.reply.trim()
      : typeof json.text === 'string' && json.text.trim()
        ? json.text.trim()
        : params.modelText.trim();

  let intent: AssistantIntent = classifyIntentHeuristic(params.mode, params.message);
  if (typeof json.intent === 'string' && isIntentAllowedForMode(params.mode, json.intent)) {
    intent = json.intent as AssistantIntent;
  }

  const rawActions = Array.isArray(json.proposedActions) ? json.proposedActions : [];
  const proposedActions = rawActions
    .map(normalizeProposedAction)
    .filter((action): action is AiProposedAction => action !== null);
  if (proposedActions.length === 0) {
    proposedActions.push({ type: 'none', requiresConfirmation: false, executable: false });
  }

  const safetyObj =
    json.safety && typeof json.safety === 'object' && !Array.isArray(json.safety)
      ? (json.safety as Record<string, unknown>)
      : null;
  const reasons = Array.isArray(safetyObj?.reasons)
    ? safetyObj!.reasons.filter((r): r is string => typeof r === 'string').map((r) => r.slice(0, 200))
    : [];

  return {
    ok: true,
    source: 'model_json',
    value: {
      schemaVersion: AI_STRUCTURED_SCHEMA_VERSION,
      mode: params.mode,
      channel: params.channel,
      intent,
      reply,
      confidence: clampConfidence(json.confidence),
      proposedActions,
      safety: {
        blocked: safetyObj?.blocked === true || intent === 'out_of_scope',
        reasons:
          intent === 'out_of_scope' && !reasons.includes('intent_out_of_scope_for_mode')
            ? [...reasons, 'intent_out_of_scope_for_mode']
            : reasons,
      },
    },
  };
}

export function buildStructuredOutputSystemAddon(mode: AssistantMode): string {
  const intents =
    mode === 'consumer_ordering'
      ? 'greet,browse_restaurants,search_menu,recommend_meals,cart_question,checkout_explain,order_status_help,payment_help,cancel_order,refund,payment_issue,delivery_help,general_help,out_of_scope'
      : 'greet,product_faq,onboarding_help,pricing_help,lead_qualify,signup_route,demo_request,general_help,out_of_scope';

  return [
    'When possible, respond with a single JSON object only (no markdown) matching:',
    '{"intent":"...","reply":"...","confidence":0-1,"proposedActions":[{"type":"none","requiresConfirmation":false}],"safety":{"blocked":false,"reasons":[]}}',
    `Allowed intents for this mode: ${intents}.`,
    'proposedActions are plans only — never claim they were executed.',
    'Do not include place_order unless the user explicitly asked; even then executable is always false server-side.',
    'Never invent cart or order mutations as completed facts.',
  ].join(' ');
}
