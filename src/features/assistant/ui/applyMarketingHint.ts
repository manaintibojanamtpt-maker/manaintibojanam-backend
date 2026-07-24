import type { NavigateFunction } from 'react-router-dom';
import type { MarketingAssistHint } from '../types';

/**
 * User-click only. Never call on assist response receipt.
 * Maps informational hints to in-app navigation or external open.
 */
export function applyMarketingHint(
  hint: MarketingAssistHint,
  navigate: NavigateFunction,
): void {
  if (hint.type === 'none') return;

  const target = hint.target?.trim();

  if (hint.type === 'open_url' && target) {
    if (/^https?:\/\//i.test(target)) {
      const opener = globalThis.window?.open?.bind(globalThis.window);
      opener?.(target, '_blank', 'noopener,noreferrer');
      return;
    }
    if (target.startsWith('/')) {
      navigate(target);
      return;
    }
  }

  if ((hint.type === 'navigate' || hint.type === 'suggest_signup') && target?.startsWith('/')) {
    navigate(target);
    return;
  }

  if (hint.type === 'suggest_signup') {
    navigate('/onboard');
    return;
  }

  if (hint.type === 'suggest_demo' || hint.type === 'suggest_contact') {
    if (target?.startsWith('/')) {
      navigate(target);
      return;
    }
    navigate('/contact');
    return;
  }

  if (hint.type === 'navigate' && target?.startsWith('/')) {
    navigate(target);
  }
}

export function marketingHintLabel(hint: MarketingAssistHint): string {
  switch (hint.type) {
    case 'suggest_signup':
      return 'Start onboarding';
    case 'suggest_demo':
      return 'Request a demo';
    case 'suggest_contact':
      return 'Contact us';
    case 'navigate':
      return hint.target?.startsWith('/') ? `Go to ${hint.target}` : 'Continue';
    case 'open_url':
      return 'Open link';
    default:
      return 'Continue';
  }
}
