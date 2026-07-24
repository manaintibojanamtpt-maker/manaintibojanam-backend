# BhojanOS Shared AI Platform — Phase 18

Status: **Refund / cancel / payment issue triage only — detect, collect context, guide, escalate; no execution; no outcome promises**

## Scope

| Deliverable | Location |
| --- | --- |
| High-risk intents | `cancel_order`, `refund`, `payment_issue` in `intentTaxonomy.ts` |
| Post-order prompt triage rules | `buildPostOrderSystemAddon()` |
| Claimed-outcome guardrails | `detectClaimedSideEffects()` |
| Client high-risk detection + guidance | `postOrderHighRiskIntents.ts`, `buildPostOrderTriageGuidance.ts` |
| Escalation hint allowlist | `postOrderPolicy.ts` (`/orders*`, `/profile`, `mailto:support@…`) |
| mailto follow in sheet | `useAssistantConversation.followHint` |
| Support constants | `orderbhojan/src/config/support.ts` |

## Dual flags (unchanged)

| Flag | Default | Role |
| --- | --- | --- |
| `FF_OB_AI_ASSISTANT` | OFF | Assistant UI |
| `FF_OB_AI_POST_ORDER` | OFF | Post-order path + triage |

## Flow

1. Detect high-risk message / intent  
2. Collect missing context (order number, payment method, status) via questions + snapshot  
3. Safe non-committal guidance from LLM + deterministic system note  
4. User-tapped escalation: tracking / My Orders / Help & support / email support  
5. **Never** cancel, refund, capture payment, or promise outcomes  

## Explicitly out of scope

- Cancel / refund / payment APIs  
- Auto-emailing support  
- Outcome SLAs presented as guarantees  
- Enabling flags by default  

## Rollback

Keep `VITE_FF_OB_AI_POST_ORDER=false` (or assistant OFF).

## Next

Optional: production canary; richer support inbox tooling — separate approval.
