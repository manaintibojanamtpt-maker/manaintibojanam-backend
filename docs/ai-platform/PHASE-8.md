# BhojanOS Shared AI Platform — Phase 8

Status: **marketing assistant UI mounted behind flag — default OFF**

## Scope (this phase only)

| Deliverable | Location |
| --- | --- |
| Flag-gated root (`null` when OFF) | `src/features/assistant/ui/MarketingAssistantRoot.tsx` |
| FAB launcher + chat panel | `MarketingAssistantLauncher.tsx`, `MarketingAssistantPanel.tsx` |
| Click-only hint chips | `MarketingAssistantHints.tsx` + `applyMarketingHint.ts` |
| Wire into marketing shell | `src/MarketingApp.tsx` |
| Tailwind scan for UI | `src/marketing.css` `@source` |

## Explicitly out of scope

- Enabling `VITE_FF_AI_MARKETING_ASSISTANT` by default
- Auto-executing `suggestedHints` on response
- Post-order AI, observability dashboard, canary rollout (later phases)
- OrderBhojan consumer chat UI
- Replacing legacy storefront `AIAssistant.tsx` (`/api/ai/chat`)

## Flag / DOM behavior

| Condition | Behavior |
| --- | --- |
| Flag OFF (default) | `MarketingAssistantRoot` → `null` — **zero launcher/panel DOM** |
| Flag ON | FAB + panel; calls `useMarketingAssist().ask` |
| Hint chips | User click only → `navigate` / `window.open` |

## Visual language

Matches bhojanos.com marketing: `#030303` / `#0A0A0A`, accent `#FF7A00`, soft CTA + soft pills. No purple chatbot chrome.

## Rollback

1. Keep `VITE_FF_AI_MARKETING_ASSISTANT` unset/`false`
2. Or remove `<MarketingAssistantRoot />` from `MarketingApp.tsx`

## Next

Phase 9: AI observability contracts + status metrics — see [PHASE-9.md](./PHASE-9.md).
