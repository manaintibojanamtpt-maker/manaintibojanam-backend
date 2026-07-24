import type { AssistantCapability, AssistantChannel, AssistantMode } from './types.js';
import { ASSISTANT_MODES } from './types.js';

const CONSUMER_CAPABILITIES: readonly AssistantCapability[] = [
  'browse_restaurants',
  'search_menu',
  'recommend_meals',
  'explain_checkout',
  'post_order_help',
  'cart_plan_readonly',
] as const;

const MARKETING_CAPABILITIES: readonly AssistantCapability[] = [
  'product_faq',
  'onboarding_guidance',
  'lead_qualification',
  'signup_routing',
] as const;

const CONSUMER_CHANNELS: readonly AssistantChannel[] = [
  'orderbhojan_web',
  'orderbhojan_android',
] as const;

const MARKETING_CHANNELS: readonly AssistantChannel[] = ['bhojanos_marketing'] as const;

export function isAssistantMode(value: unknown): value is AssistantMode {
  return typeof value === 'string' && (ASSISTANT_MODES as readonly string[]).includes(value);
}

export function resolveAssistantChannel(value: unknown): AssistantChannel {
  if (
    value === 'orderbhojan_web' ||
    value === 'orderbhojan_android' ||
    value === 'bhojanos_marketing'
  ) {
    return value;
  }
  return 'unknown';
}

export function getAllowedCapabilities(mode: AssistantMode): readonly AssistantCapability[] {
  return mode === 'consumer_ordering' ? CONSUMER_CAPABILITIES : MARKETING_CAPABILITIES;
}

/**
 * Mode/channel policy: prevent consumer↔merchant cross-use.
 * unknown channel is allowed only for server diagnostics in Phase 1.
 */
export function assertModeChannelPolicy(
  mode: AssistantMode,
  channel: AssistantChannel,
): { ok: true } | { ok: false; error: string } {
  if (channel === 'unknown') {
    return { ok: true };
  }
  if (mode === 'consumer_ordering' && !(CONSUMER_CHANNELS as readonly string[]).includes(channel)) {
    return {
      ok: false,
      error: 'consumer_ordering mode is not allowed for this channel',
    };
  }
  if (mode === 'merchant_marketing' && !(MARKETING_CHANNELS as readonly string[]).includes(channel)) {
    return {
      ok: false,
      error: 'merchant_marketing mode is not allowed for this channel',
    };
  }
  return { ok: true };
}

export function buildModeSystemPrompt(mode: AssistantMode): string {
  if (mode === 'consumer_ordering') {
    return [
      'You are the BhojanOS / OrderBhojan consumer ordering assistant.',
      'Help users browse restaurants, search menus, recommend meals, explain checkout, and answer post-order / order-status questions.',
      'You MUST NOT claim cart or order changes were applied.',
      'You MUST NOT place, cancel, reorder, refund, or mutate orders.',
      'You have no tools in this phase — answer with guidance only.',
      'Never discuss internal merchant admin or KYC workflows.',
    ].join(' ');
  }

  return [
    'You are the BhojanOS marketing and onboarding assistant for restaurant owners.',
    'Explain BhojanOS product capabilities, onboarding, and how to sign up or book a demo.',
    'Qualify lead intent politely and suggest contact/signup paths.',
    'You MUST NOT perform cart, checkout, or order actions.',
    'You have no tools in this phase — answer with guidance only.',
  ].join(' ');
}
