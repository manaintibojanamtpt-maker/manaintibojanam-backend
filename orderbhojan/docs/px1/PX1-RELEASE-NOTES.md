# PX1 Release Notes

**Version:** `0.9.0-px1`  
**Tag:** `orderbhojan-v0.9.0-px1`  
**Status:** **DRAFT** — pending Visual Certification

---

## Summary

PX1 transforms OrderBhojan from a technically complete marketplace into a **premium consumer food product**. Full presentation rebuild using BDS v1.1-px1. No new business features.

---

## What's new

### Experience
- Food-first immersive home with full-bleed hero
- Cinematic restaurant pages — compressed, focused
- Menu signature experience — FoodRow layout, fly-to-cart, haptics
- Premium search — instant, warm, navigable results
- Consumer profile — human account shell
- Premium cart preview — line items with photography
- NavIsland + MiniNavIsland — persistent navigation context
- MIB warm dark `food` theme default

### Design system
- BDS v1.1-px1: 20+ new/extended components
- Warm glass, motion tokens, appetite image pipeline
- Zero local UI components in OrderBhojan

---

## What's unchanged

- Marketplace APIs, MSW, Firestore
- Authentication logic
- Feature flags
- Routing paths
- Cart/checkout/orders **logic** (checkout still blocked for M7)

---

## Breaking changes (presentation)

- All experience CSS replaced — custom `ob-m65-*` classes removed
- Components import from BDS v1.1 only
- Default theme `food` instead of `system`

See [PX1-MIGRATION-GUIDE.md](./PX1-MIGRATION-GUIDE.md).

---

## Quality gates

```bash
npm run gate:px1
```

- Engineering gate pass
- Visual Certification ≥9.5 all categories
- DRB annotated screenshots approved

---

## Upgrade path

From `0.8.5-m65`:

1. Update BDS dependency to v1.1-px1
2. Remove `.env` overrides for deprecated CSS
3. Run gate:px1

---

## Known limitations

- Checkout, orders, tracking — visual shells only; M7 blocked
- Voice search — not included until feature ships

---

## Sign-off required

CEO · PM · ARB · DRB unanimous approval before M7 may begin.

**Release date:** TBD after Visual Certification
