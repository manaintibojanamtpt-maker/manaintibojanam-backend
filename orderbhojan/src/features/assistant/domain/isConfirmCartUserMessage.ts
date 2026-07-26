/** Spoken/typed intents that mean “apply the pending cart plan”. */

const CONFIRM_RE =
  /^(?:yes|yeah|yep|yup|ok|okay|sure|please|confirm|confirmed|go\s*ahead|do\s*it|add\s*it|add\s*them|proceed|apply|sounds?\s*good|that'?s?\s*fine|haan|ha|sahi)\b[\s!.]*$/i;

const DISCARD_RE =
  /^(?:no|nope|nah|cancel|discard|never\s*mind|dont|don'?t|forget\s*it|not\s*now)\b[\s!.]*$/i;

const STOP_AGENT_RE =
  /^(?:stop|stop\s*listening|stop\s*voice|end\s*voice|goodbye|bye|exit\s*voice|hang\s*up)\b[\s!.]*$/i;

export function isConfirmCartUserMessage(message: string): boolean {
  const text = message.trim();
  if (!text || text.length > 48) return false;
  return CONFIRM_RE.test(text);
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
