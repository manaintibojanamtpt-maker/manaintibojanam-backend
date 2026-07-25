import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, X } from 'lucide-react';
import {
  captureMarketingVoiceTranscript,
  isMarketingVoiceCaptureAvailable,
} from '../infrastructure/marketingVoiceCapture';
import { MarketingAssistantHints } from './MarketingAssistantHints';
import type { MarketingChatMessage } from './useMarketingAssistantChat';

const STARTERS = [
  'How does BhojanOS help cloud kitchens?',
  'What does onboarding look like?',
  'How do I see pricing?',
] as const;

interface MarketingAssistantPanelProps {
  readonly messages: readonly MarketingChatMessage[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly rateLimited: boolean;
  readonly onClose: () => void;
  readonly onSend: (text: string) => void;
  readonly onClearError: () => void;
  readonly onVoiceError?: (message: string) => void;
}

export function MarketingAssistantPanel({
  messages,
  loading,
  error,
  rateLimited,
  onClose,
  onSend,
  onClearError,
  onVoiceError,
}: MarketingAssistantPanelProps) {
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceAvailable] = useState(() => isMarketingVoiceCaptureAvailable());
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const voiceAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const text = draft.trim();
    if (!text || loading || listening) return;
    setDraft('');
    void onSend(text);
  };

  const startVoice = async () => {
    if (!voiceAvailable || loading || listening) return;
    onClearError();
    const ac = new AbortController();
    voiceAbortRef.current = ac;
    setListening(true);
    try {
      const transcript = await captureMarketingVoiceTranscript({ signal: ac.signal });
      setDraft(transcript);
      void onSend(transcript);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Voice capture failed';
      if (!/cancelled/i.test(message)) {
        onVoiceError?.(message);
      }
    } finally {
      setListening(false);
      voiceAbortRef.current = null;
    }
  };

  const stopVoice = () => {
    voiceAbortRef.current?.abort();
  };

  useEffect(() => {
    return () => {
      voiceAbortRef.current?.abort();
    };
  }, []);

  return (
    <div
      className="fixed inset-x-3 bottom-20 z-[110] mx-auto flex max-h-[min(70dvh,560px)] w-full max-w-md flex-col overflow-hidden rounded-[1.25rem] border border-white/[0.08] bg-[#0A0A0A]/95 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-md sm:inset-x-auto sm:right-6 sm:bottom-24 animate-[marketing-fade-up_0.28s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="marketing-assistant-title"
      data-testid="marketing-assistant-panel"
    >
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div>
          <h2 id="marketing-assistant-title" className="text-sm font-semibold text-white">
            BhojanOS Assistant
          </h2>
          <p className="text-xs text-neutral-400">Product questions — no account required</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-neutral-400 transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Close assistant"
        >
          <X size={18} />
        </button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !loading && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-300">
              Ask about onboarding, pricing, or how BhojanOS fits your kitchen.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-left text-xs text-neutral-200 transition hover:border-[#FF7A00]/40 hover:text-white"
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
            className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <div
              className={
                msg.role === 'user'
                  ? 'max-w-[85%] rounded-2xl rounded-br-md bg-[#FF7A00] px-3 py-2 text-sm text-black'
                  : 'max-w-[90%] rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-neutral-100'
              }
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.role === 'assistant' && msg.hints && msg.hints.length > 0 ? (
                <MarketingAssistantHints hints={msg.hints} />
              ) : null}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start" aria-live="polite">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-xs text-neutral-400">
              Thinking…
            </div>
          </div>
        )}

        {error && (
          <div
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
            role="alert"
          >
            <p>{error}</p>
            {rateLimited ? (
              <button
                type="button"
                className="mt-2 text-[#FF7A00] underline-offset-2 hover:underline"
                onClick={onClearError}
              >
                Dismiss — try again in a moment
              </button>
            ) : (
              <button
                type="button"
                className="mt-2 text-[#FF7A00] underline-offset-2 hover:underline"
                onClick={onClearError}
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>

      <footer className="border-t border-white/[0.06] p-3">
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
            placeholder={listening ? 'Listening…' : 'Ask about BhojanOS…'}
            disabled={loading || listening}
            className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-[#FF7A00]/50 focus:outline-none"
          />
          {voiceAvailable ? (
            <button
              type="button"
              onClick={() => {
                if (listening) stopVoice();
                else void startVoice();
              }}
              disabled={loading}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-[#FF7A00]/40 bg-[#FF7A00]/15 text-[#FF7A00] transition hover:bg-[#FF7A00]/25 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={listening ? 'Stop listening' : 'Ask with voice'}
              data-testid="marketing-assistant-mic"
            >
              {listening ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={loading || listening || !draft.trim()}
            className="marketing-soft-cta shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="marketing-soft-cta-inner px-3 py-2 text-sm">Send</span>
          </button>
        </div>
        {voiceAvailable ? (
          <p className="mt-2 text-[11px] text-neutral-500">
            Mic captures one phrase — product guidance only, no account actions.
          </p>
        ) : null}
      </footer>
    </div>
  );
}
