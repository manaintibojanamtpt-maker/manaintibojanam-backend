import { useCallback, useState } from 'react';
import { useMarketingAssist } from '../hooks/useMarketingAssist';
import { AssistantApiError, type MarketingAssistHint } from '../types';

export interface MarketingChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly text: string;
  readonly hints?: readonly MarketingAssistHint[];
}

function nextId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Local chat state for the marketing assistant panel.
 * Never auto-executes hints; never retries rate limits in a loop.
 */
export function useMarketingAssistantChat() {
  const { enabled, ask } = useMarketingAssist();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<readonly MarketingChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const send = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || loading) return;

      setError(null);
      setRateLimited(false);
      setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: message }]);
      setLoading(true);

      try {
        const result = await ask({
          message,
          ...(conversationId ? { conversationId } : {}),
        });
        setConversationId(result.conversationId);
        const hints = result.suggestedHints.filter((h) => h.type !== 'none');
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            text: result.reply,
            ...(hints.length > 0 ? { hints } : {}),
          },
        ]);
      } catch (err) {
        if (err instanceof AssistantApiError) {
          setError(err.message);
          setRateLimited(err.code === 'AI_RATE_LIMITED');
        } else {
          setError(err instanceof Error ? err.message : 'Something went wrong.');
        }
      } finally {
        setLoading(false);
      }
    },
    [ask, conversationId, loading],
  );

  return {
    enabled,
    open,
    setOpen,
    messages,
    loading,
    error,
    rateLimited,
    send,
    setError,
    clearError: () => {
      setError(null);
      setRateLimited(false);
    },
  };
}
