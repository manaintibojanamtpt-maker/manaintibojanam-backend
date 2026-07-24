import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketingSoftPill } from '../../../components/marketing/MarketingSoftPill';
import type { MarketingAssistHint } from '../types';
import { applyMarketingHint, marketingHintLabel } from './applyMarketingHint';

interface MarketingAssistantHintsProps {
  readonly hints: readonly MarketingAssistHint[];
}

/** Click-to-act chips only — never auto-executed on assist response. */
export function MarketingAssistantHints({ hints }: MarketingAssistantHintsProps) {
  const navigate = useNavigate();
  const actionable = hints.filter((h) => h.type !== 'none');
  if (actionable.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2" data-testid="marketing-assistant-hints">
      {actionable.map((hint, index) => (
        <MarketingSoftPill
          key={`${hint.type}-${hint.target ?? ''}-${index}`}
          as="button"
          variant="tab"
          onClick={() => applyMarketingHint(hint, navigate)}
        >
          {marketingHintLabel(hint)}
        </MarketingSoftPill>
      ))}
    </div>
  );
}
