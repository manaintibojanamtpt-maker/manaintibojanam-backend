# Implementation Handoff — PX1.5 → Engineering

**Audience:** Implementation agents (inactive until design freeze approved)  
**Read order:** This doc → DESIGN-FREEZE.md → SCREEN-BLUEPRINTS.md → COMPONENT-MAPPING.md

---

## You may begin when

- [ ] CEO + PM + ARB + DRB signed [DESIGN-FREEZE.md](./DESIGN-FREEZE.md)
- [ ] BDS v1.1-px15 tagged
- [ ] DRB annotated screenshots approved against prototypes

---

## What to build (in order)

### Phase A — BDS v1.1-px15
1. Tokens from [DESIGN-TOKENS.md](./DESIGN-TOKENS.md)
2. Components from [BDS-CHANGES.md](./BDS-CHANGES.md)
3. Storybook — must match `prototypes/*.svg` within 2px tolerance
4. `gate:bds-px15`

### Phase B — OrderBhojan shell
1. Theme `food` default
2. NavIsland / SideNav / MiniNavIsland
3. Delete old CSS/motion files
4. Single layout utility file only

### Phase C — Screen rebuild (replace, don't patch)
1. Profile → Search → Home → Cart → Restaurant → Menu → Sheets
2. Each screen: match blueprint + prototype
3. Wire existing routes/hooks only — no new business logic

### Phase D — Motion
1. BDS motion exports per [MOTION-SPECIFICATION.md](./MOTION-SPECIFICATION.md)
2. Reduced motion paths

### Phase E — Certification
1. Screenshot matrix all breakpoints/themes
2. DRB score ≥9.5 all categories
3. `gate:px1`

---

## What NOT to build

- Checkout flow logic
- Payments
- Orders backend
- Tracking map
- M7 composer
- New API endpoints
- New routes (use existing paths)
- Local UI components

---

## Acceptance per screen

Engineering done ≠ screen done. Screen done when:

1. Matches prototype SVG (DRB visual diff)
2. All interactions in [INTERACTION-SPECIFICATION.md](./INTERACTION-SPECIFICATION.md)
3. All motion in [MOTION-SPECIFICATION.md](./MOTION-SPECIFICATION.md)
4. Responsive per [RESPONSIVE-SPECIFICATION.md](./RESPONSIVE-SPECIFICATION.md)
5. a11y per [ACCESSIBILITY-SPECIFICATION.md](./ACCESSIBILITY-SPECIFICATION.md)
6. DRB App Store test = YES

---

## Copy rules (automated gate)

**Forbidden strings in user-visible UI:**
- M0–M7, Firestore, UID, mock, preview shell, coming soon (for placeholder sections — hide instead)

---

## File deletion list (OrderBhojan)

```
src/features/experience/motion/premiumMotion.tsx
src/styles/experience-premium-m65.css
src/features/experience/ui/shared/MarketplaceRestaurantTile.tsx  → BDS
src/features/experience/ui/shared/MarketplaceFoodTile.tsx       → BDS
src/features/food/ui/FoodCardItem.tsx                           → BDS FoodRow
(Merge presentation into page files using BDS only)
```

---

## Questions protocol

| Question type | Ask |
|---------------|-----|
| Design ambiguity | DRB |
| BDS API shape | ARB |
| Scope / feature | PM |
| Ship decision | CEO |

**Do not guess.** Design is frozen.

---

## Reference prototypes

```
orderbhojan/docs/px15/prototypes/
```

Open SVGs alongside Storybook during implementation for pixel comparison.

---

## Version targets

| Artifact | Version |
|----------|---------|
| Design freeze | 0.8.9-px15 |
| BDS | 1.1.0-px15 |
| OrderBhojan (post-impl) | 0.9.0-px1 |

---

## Success statement

When complete, every engineer who reads this package can implement without asking "how should this look?" — only "where does this hook connect?" (and that answer is unchanged from M6).
