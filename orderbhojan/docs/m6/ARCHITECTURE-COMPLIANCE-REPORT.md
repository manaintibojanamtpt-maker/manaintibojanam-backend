# M6 Architecture Compliance Report

**Milestone:** M6 — Food Experience Platform  
**Version:** `0.8.0-m6`

## Frozen architecture (M5 and prior)

No changes to BhojanOS, discovery, search, or restaurant experience modules beyond M5 Open Menu wiring.

## M6 layer compliance

| Rule | Compliance |
|------|------------|
| UI never calls Marketplace API directly | ✓ via `foodApiClient` + `foodExperienceLayer` |
| Public food model only | ✓ no tenant/branch/Firestore IDs |
| BDS-only UI | ✓ `@bhojan/design-system` |
| Feature flag default OFF | ✓ `FF_OB_MENU: false` |
| No cart/checkout/payments | ✓ preview store only |
| MSW acceptable | ✓ handlers in `foodExperienceMockLogic.ts` |

## Extension hooks (placeholders)

- `enrichWithAiBadges` — future AI badges
- `enrichWithRecommendations` — future ranking/combos
- Recently viewed section — UI placeholder
- AI badge on food cards — visual placeholder

## Quality gate

All checks enforced via `scripts/gate-m6.mjs`.
