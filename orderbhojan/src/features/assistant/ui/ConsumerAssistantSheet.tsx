import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import type { CartPlanValidationResult } from '../domain/cartPlanContract';
import type { AssistantThreadMessage } from './useAssistantConversation';
import type { ConsumerAssistHint } from '../types';

const ORDERING_STARTERS = [
  'What vegetarian options look good?',
  'Help me pick something mild',
  'Explain delivery fees',
] as const;

const PERSONALIZATION_STARTERS = [
  'Reorder my last order',
  'Order my usual',
  'Show my favorite kitchens',
] as const;

const POST_ORDER_STARTERS = [
  'Where is my order?',
  'Why is delivery taking long?',
  'How do I reorder the same items?',
  'Something looks wrong with my order',
  'My payment didn’t go through',
  'I need a refund for this order',
  'How do I cancel this order?',
] as const;

interface ConsumerAssistantSheetProps {
  readonly messages: readonly AssistantThreadMessage[];
  readonly loading: boolean;
  readonly validating: boolean;
  readonly applying: boolean;
  readonly listening?: boolean;
  readonly speaking?: boolean;
  readonly voiceAgentActive?: boolean;
  readonly error: string | null;
  readonly pendingValidation: CartPlanValidationResult | null;
  readonly voiceEnabled?: boolean;
  readonly voiceAvailable?: boolean;
  readonly personalizationEnabled?: boolean;
  readonly assistMode?: 'ordering' | 'post_order';
  readonly onClose: () => void;
  readonly onSend: (text: string) => void;
  readonly onVoiceStart?: () => void;
  readonly onVoiceCancel?: () => void;
  readonly onStartVoiceAgent?: () => void;
  readonly onStopVoiceAgent?: () => void;
  readonly onFollowHint: (hint: ConsumerAssistHint) => void;
  readonly onConfirmPlan: () => void;
  readonly onDismissPlan: () => void;
  readonly onClearError: () => void;
}

export function ConsumerAssistantSheet({
  messages,
  loading,
  validating,
  applying,
  listening = false,
  speaking = false,
  voiceAgentActive = false,
  error,
  pendingValidation,
  voiceEnabled = false,
  voiceAvailable = false,
  personalizationEnabled = false,
  assistMode = 'ordering',
  onClose,
  onSend,
  onVoiceStart,
  onVoiceCancel,
  onStartVoiceAgent,
  onStopVoiceAgent,
  onFollowHint,
  onConfirmPlan,
  onDismissPlan,
  onClearError,
}: ConsumerAssistantSheetProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, validating]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const text = draft.trim();
    if (!text || loading) return;
    setDraft('');
    void onSend(text);
  };

  const canConfirm =
    pendingValidation?.status === 'validated' &&
    pendingValidation.valid &&
    !applying &&
    !loading &&
    !listening;

  const showMic = voiceEnabled && voiceAvailable && Boolean(onVoiceStart);
  const micBusy = loading || validating || applying || listening;
  const starters =
    assistMode === 'post_order'
      ? POST_ORDER_STARTERS
      : personalizationEnabled
        ? [...PERSONALIZATION_STARTERS, ...ORDERING_STARTERS]
        : ORDERING_STARTERS;
  const isPostOrder = assistMode === 'post_order';

  return (
    <div
      className="fixed inset-x-3 z-[88] mx-auto flex max-h-[min(68dvh,540px)] w-full max-w-md flex-col overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#120D0A]/96 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-md"
      style={{ bottom: 'calc(118px + var(--ob-safe-bottom, 0px))' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="consumer-assistant-title"
      data-testid="consumer-assistant-sheet"
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={
              listening || speaking || voiceAgentActive
                ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b35] to-[#ffb347] shadow-[0_0_20px_rgba(255,122,0,0.55)]'
                : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#FF7A00]/40 bg-black/40'
            }
            aria-hidden
          >
            <span className="flex h-3.5 items-end gap-[2px]">
              <span className={`w-[2.5px] rounded-full ${listening || speaking ? 'h-2 animate-pulse bg-black/80' : 'h-2 bg-[#FF7A00]'}`} />
              <span className={`w-[2.5px] rounded-full ${listening || speaking ? 'h-3.5 animate-pulse bg-black/90' : 'h-3.5 bg-[#FF7A00]'}`} />
              <span className={`w-[2.5px] rounded-full ${listening || speaking ? 'h-2.5 animate-pulse bg-black/80' : 'h-2.5 bg-[#FF7A00]'}`} />
            </span>
          </div>
          <div className="min-w-0">
            <h2 id="consumer-assistant-title" className="text-sm font-semibold text-[#fffaf3]">
              OrderBhojan Voice Agent
            </h2>
            <p className="text-xs text-[#d0c4b5]">
              {isPostOrder
                ? 'Post-order help · speak tracking or support questions'
                : voiceAgentActive
                  ? 'Live voice · say a dish, then “confirm” to add'
                  : 'Voice + chat · cart still needs your confirm'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs text-[#d0c4b5] hover:bg-white/5 hover:text-white"
        >
          Close
        </button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !loading && (
          <div className="space-y-3">
            <p className="text-sm text-[#d0c4b5]">
              {isPostOrder
                ? 'Ask about tracking, delivery, reorder shortcuts, or cancel/refund/payment issues. This chat guides and escalates — it never cancels, refunds, or promises outcomes.'
                : 'Tap Live Voice for hands-free ordering. Say a kitchen or dish, then “confirm” after validation — nothing is added until you confirm.'}
            </p>
            {showMic && onStartVoiceAgent ? (
              <button
                type="button"
                onClick={() => {
                  if (voiceAgentActive) onStopVoiceAgent?.();
                  else onStartVoiceAgent();
                }}
                className="w-full rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c] px-3 py-2.5 text-sm font-semibold text-black"
                data-testid="consumer-assistant-live-voice"
              >
                {voiceAgentActive ? 'Stop live voice' : 'Start live voice agent'}
              </button>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {starters.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-left text-xs text-[#fffaf3] transition hover:border-[#FF7A00]/40"
                  onClick={() => void onSend(starter)}
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.role === 'user'
                ? 'flex justify-end'
                : msg.role === 'system'
                  ? 'flex justify-center'
                  : 'flex justify-start'
            }
          >
            <div
              className={
                msg.role === 'user'
                  ? 'max-w-[85%] rounded-2xl rounded-br-md bg-[#FF7A00] px-3 py-2 text-sm text-black'
                  : msg.role === 'system'
                    ? 'max-w-[95%] rounded-xl border border-[#FF7A00]/25 bg-[#FF7A00]/10 px-3 py-2 text-xs text-[#ffe0c2]'
                    : 'max-w-[90%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#fffaf3]'
              }
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {msg.cartActions && msg.cartActions.length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-white/10 pt-2 text-[11px] text-[#d0c4b5]">
                  {msg.cartActions.map((action, idx) => (
                    <li key={`${action.type}-${idx}`}>
                      {action.type.replace(/_/g, ' ')}
                      {typeof action.payload?.name === 'string' ? ` · ${action.payload.name}` : ''}
                      {typeof action.payload?.itemId === 'string' ? ` (${action.payload.itemId})` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}

              {msg.hints && msg.hints.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {msg.hints.map((hint, idx) => (
                    <button
                      key={`${hint.type}-${hint.target ?? ''}-${idx}`}
                      type="button"
                      className="rounded-full border border-[#FF7A00]/40 bg-[#FF7A00]/15 px-2.5 py-1 text-[11px] text-[#ffe0c2]"
                      onClick={() => onFollowHint(hint)}
                    >
                      {hint.type === 'navigate' && hint.target === '/profile'
                        ? 'Help & support'
                        : hint.type === 'navigate' && hint.target?.includes('/track')
                          ? 'Open tracking'
                          : hint.type === 'navigate' && hint.target === '/orders'
                            ? 'My Orders'
                            : hint.type === 'open_url' && hint.target?.startsWith('mailto:')
                              ? 'Email support'
                              : hint.type === 'navigate'
                                ? hint.target || 'Go'
                                : hint.type === 'open_url'
                                  ? 'Open link'
                                  : 'Continue'}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {(loading || validating || listening || speaking) && (
          <div className="text-xs text-[#d0c4b5]" aria-live="polite">
            {listening
              ? voiceAgentActive
                ? 'Listening live… speak naturally, then pause.'
                : 'Listening… speak, then pause.'
              : speaking
                ? 'Speaking…'
                : loading
                  ? 'Thinking…'
                  : 'Validating cart plan…'}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200" role="alert">
            <p>{error}</p>
            <button type="button" className="mt-1 text-[#FF7A00] underline" onClick={onClearError}>
              Dismiss
            </button>
          </div>
        )}
      </div>

      {pendingValidation ? (
        <div
          className="border-t border-white/10 px-4 py-3"
          data-testid="consumer-assistant-cart-confirm"
        >
          <p className="text-xs text-[#d0c4b5] mb-2">
            Status: <span className="text-[#fffaf3]">{pendingValidation.status}</span>
            {pendingValidation.issues[0] ? ` · ${pendingValidation.issues[0].message}` : ''}
          </p>
          {pendingValidation.clarificationQuestions.length > 0 ? (
            <ul
              className="mb-2 list-disc space-y-1 pl-4 text-[11px] text-[#ffe0c2]"
              data-testid="consumer-assistant-clarifications"
            >
              {pendingValidation.clarificationQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => void onConfirmPlan()}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c] px-3 py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              {applying ? 'Applying…' : 'Confirm & add to cart'}
            </button>
            <button
              type="button"
              onClick={onDismissPlan}
              className="rounded-xl border border-white/15 px-3 py-2.5 text-sm text-[#d0c4b5]"
            >
              Discard
            </button>
          </div>
          {!canConfirm && pendingValidation.status !== 'validated' ? (
            <p className="mt-2 text-[11px] text-[#d0c4b5]">
              Confirm stays disabled until the plan is validated. Reply with the exact item if asked.
            </p>
          ) : null}
        </div>
      ) : null}

      <footer className="border-t border-white/10 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={listening ? 'Listening…' : 'Ask OrderBhojan…'}
            disabled={loading || listening}
            className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-[#fffaf3] placeholder:text-[#8a7f72] focus:border-[#FF7A00]/50 focus:outline-none"
          />
          {showMic ? (
            <button
              type="button"
              onClick={() => {
                if (listening) {
                  onVoiceCancel?.();
                  return;
                }
                onVoiceStart?.();
              }}
              disabled={micBusy && !listening}
              aria-label={listening ? 'Stop listening' : 'Speak your question'}
              aria-pressed={listening}
              data-testid="consumer-assistant-mic"
              className={
                listening
                  ? 'shrink-0 rounded-xl border border-red-400/40 bg-red-500/20 px-3 py-2.5 text-red-200'
                  : 'shrink-0 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-[#FF7A00] disabled:opacity-40'
              }
            >
              {listening ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={loading || listening || !draft.trim()}
            className="shrink-0 rounded-xl bg-[#FF7A00] px-3 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
          >
            Send
          </button>
        </div>
        {showMic ? (
          <p className="mt-2 text-[10px] text-[#8a7f72]">
            {voiceAgentActive
              ? 'Live mode: listen → reply by voice → listen again. Say “confirm” to apply a validated plan, or “stop listening” to pause.'
              : 'Tap mic for one turn, or Start live voice agent for continuous talk. Cart still needs Confirm.'}
          </p>
        ) : null}
      </footer>
    </div>
  );
}
