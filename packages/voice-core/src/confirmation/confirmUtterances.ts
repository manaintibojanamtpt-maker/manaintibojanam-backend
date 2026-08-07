/**
 * Spoken/typed intents for cart confirm / discard / stop.
 * Single source of truth for @bhojan/voice-core ConfirmationStateMachine.
 */

const CONFIRM_TOKEN_RE =
  /^(?:yes|yeah|yep|yup|ok|okay|sure|please|confirm|confirmed|go\s*ahead|do\s*it|add\s*it|add\s*them|proceed|apply|sounds?\s*good|that'?s?\s*fine|haan|ha|sahi|avunu|avadu)$/i;

const CONFIRM_RE =
  /^(?:yes|yeah|yep|yup|ok|okay|sure|please|confirm|confirmed|go\s*ahead|do\s*it|add\s*it|add\s*them|proceed|apply|sounds?\s*good|that'?s?\s*fine|haan|ha|sahi|avunu)\b[\s!.]*$/i;

/**
 * Natural “apply the validated plan” phrases (ASR often adds kitchen noise).
 * Only used when a validated pending plan already exists.
 */
const CONFIRM_APPLY_PENDING_RE =
  /\b(?:confirm(?:ed)?|yes|yeah|yep|yup|ok(?:ay)?|sure|please|go\s*ahead|proceed|haan|avunu)\b[\s\S]{0,48}\b(?:add(?:ing)?|cart|apply)\b|\b(?:add|put)\b[\s\S]{0,32}\b(?:to\s+)?(?:the\s+)?cart\b|\bconfirm(?:ed)?\s+(?:and\s+)?(?:add|apply)\b|\badd\s+(?:it|them|this|that)\b/i;

/** Clear new add-order — must not steal confirm when customer means a different dish. */
const NEW_ADD_ORDER_RE = /^(?:please\s+)?add\s+\d+\s+.+/i;

const DISCARD_RE =
  /^(?:no|nope|nah|cancel|discard|never\s*mind|dont|don'?t|forget\s*it|not\s*now)\b[\s!.]*$/i;

const STOP_AGENT_RE =
  /^(?:stop|stop\s*listening|stop\s*voice|end\s*voice|goodbye|bye|exit\s*voice|hang\s*up)\b[\s!.]*$/i;

/** Normalize ASR noise: trailing punctuation, extra spaces. */
function normalizeConfirmText(message: string): string {
  return message
    .trim()
    .replace(/[.!,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * True when the utterance is only confirm-family tokens.
 * Accepts ASR repeats like “Confirm Confirm” or “yes confirm”.
 */
export function isConfirmCartUserMessage(message: string): boolean {
  const text = normalizeConfirmText(message);
  if (!text || text.length > 64) return false;
  if (CONFIRM_RE.test(text)) return true;

  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 0 || parts.length > 6) return false;
  return parts.every((part) => CONFIRM_TOKEN_RE.test(part));
}

/**
 * Bare “yes/ok” is only a cart confirm when the plan is already validated.
 * Also accepts natural phrases: “confirm and add to cart”, “add it to cart”,
 * and ASR-noisy “confirm Andhra add to cart”.
 */
export function isValidatedCartConfirmMessage(
  message: string,
  pending: { readonly status: string; readonly valid?: boolean } | null | undefined,
): boolean {
  if (!pending || pending.status !== 'validated' || pending.valid !== true) return false;
  if (isConfirmCartUserMessage(message)) return true;

  const text = normalizeConfirmText(message);
  if (!text || text.length > 120) return false;

  // “add 2 chicken biryani” without cart → new order, not apply-pending.
  if (NEW_ADD_ORDER_RE.test(text) && !/\bcart\b/i.test(text)) {
    return false;
  }

  return CONFIRM_APPLY_PENDING_RE.test(text);
}

export function isDiscardCartUserMessage(message: string): boolean {
  const text = message.trim();
  if (!text || text.length > 48) return false;
  return DISCARD_RE.test(text);
}

export function isStopVoiceAgentMessage(message: string): boolean {
  const text = message.trim();
  if (!text || text.length > 64) return false;
  return STOP_AGENT_RE.test(text);
}

/** Short spoken reply for TTS (keep voice turns snappy). */
export function toSpokenAssistantReply(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const parts = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [cleaned];
  return parts.slice(0, 2).join(' ').trim().slice(0, 280);
}
