import React from 'react';
import { useAiMarketingAssistantFeature } from '../hooks/useAiMarketingAssistantFeature';
import { MarketingAssistantLauncher } from './MarketingAssistantLauncher';
import { MarketingAssistantPanel } from './MarketingAssistantPanel';
import { useMarketingAssistantChat } from './useMarketingAssistantChat';

/**
 * Phase 8 marketing assistant UI.
 * Flag OFF (default) ⇒ returns null — zero launcher/panel DOM.
 */
export function MarketingAssistantRoot() {
  const enabled = useAiMarketingAssistantFeature();
  if (!enabled) return null;
  return <MarketingAssistantWidget />;
}

function MarketingAssistantWidget() {
  const chat = useMarketingAssistantChat();

  return (
    <>
      {chat.open ? (
        <MarketingAssistantPanel
          messages={chat.messages}
          loading={chat.loading}
          error={chat.error}
          rateLimited={chat.rateLimited}
          onClose={() => chat.setOpen(false)}
          onSend={chat.send}
          onClearError={chat.clearError}
          onVoiceError={chat.setError}
        />
      ) : null}
      <MarketingAssistantLauncher open={chat.open} onToggle={() => chat.setOpen((v) => !v)} />
    </>
  );
}

export default MarketingAssistantRoot;
