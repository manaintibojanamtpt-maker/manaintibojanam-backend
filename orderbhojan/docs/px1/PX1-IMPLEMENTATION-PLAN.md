# PX1 Implementation Plan

**Program:** PX1  
**Stage:** 4 — Implementation  
**Status:** **BLOCKED** — awaiting Stage 2 DRB + Stage 3 ARB approval

---

## Preconditions (all required)

- [ ] CEO accepted Experience Review ✅
- [ ] DRB approved PX1-HIGH-FIDELITY-DESIGNS.md
- [ ] ARB approved PX1-BDS-EVOLUTION.md
- [ ] Annotated screenshots attached to design frames
- [ ] BDS v1.1-px1 published to `packages/design-system`

**If any precondition fails → STOP. Do not implement.**

---

## Scope

### In scope (presentation rebuild)

| Screen | Action |
|--------|--------|
| Home | Full rebuild |
| Restaurant | Full rebuild |
| Menu | Full rebuild |
| Search | Full rebuild |
| Profile | Full rebuild |
| Cart Preview | Full rebuild |
| NavIsland / MiniNavIsland | Full rebuild |
| Bottom sheets (address, customize) | Restyle via BDS |
| Loading / skeletons | Replace all |
| Dark / light `food` theme | Adopt globally |

### Out of scope (CEO block)

- Checkout logic
- Payments
- Orders backend
- Tracking
- M7 Order Composer
- Marketplace API changes
- Firestore / auth logic changes
- Routing architecture changes
- Feature flag logic changes

---

## Implementation phases

### Phase 0 — BDS v1.1-px1 (1–2 weeks)

1. Add tokens (color, type, spacing, shadow, motion)
2. Implement new components with Storybook stories
3. Extend existing components (non-breaking)
4. `gate:bds-px1` — BDS-only tests
5. DRB Storybook walkthrough

**Exit:** BDS v1.1-px1 tagged, Storybook approved

### Phase 1 — Foundation (3–4 days)

1. OrderBhojan: bump BDS dependency to v1.1-px1
2. `DesignSystemProvider theme="food"`
3. Remove `experience-premium-m65.css`, `premiumMotion.tsx`
4. Consolidate CSS → single `experience-px1.css` (layout utilities only, no component styles)
5. `MarketplaceLayout` → BDS NavIsland / SideNav responsive
6. MiniNavIsland on immersive routes

**Exit:** Shell + nav certified on all breakpoints

### Phase 2 — Critical screens (1 week)

Order matters — each screen replaces previous entirely:

1. **Profile** — remove all developer UI
2. **Search** — PremiumSearch + navigation wiring (existing routes)
3. **Home** — ImmersiveHero + fix all navigation + remove skeleton persistence
4. **Cart Preview** — CartBar + line items shell

**Exit:** No milestone copy anywhere; all home cards navigate

### Phase 3 — Core ordering journey (1–2 weeks)

1. **Restaurant** — RestaurantHero compressed layout
2. **Menu** — FoodRow + StickyCategoryRail + CartBar
3. **Customize sheet** — warm-glass BottomSheet
4. **Address sheet** — warm-glass restyle

**Exit:** Home → Restaurant → Menu → Cart journey feels native

### Phase 4 — Motion & delight (3–5 days)

1. SharedHero transitions (home → restaurant)
2. FlyToCart on all ADD actions
3. Haptic layer (useHaptic)
4. Favorite burst
5. Skeleton → content morph

**Exit:** Motion category ≥9.5 in certification

### Phase 5 — Responsive (3–5 days)

1. Tablet layouts (sidebar menu, 2-col home)
2. Desktop SideNav + editorial grid
3. Landscape compact
4. Foldable dual-pane (where supported)

**Exit:** Responsive report pass

### Phase 6 — Visual certification (1 week)

1. Screenshot capture: mobile/tablet/desktop × light/dark per screen
2. DRB scoring per [PX1-VISUAL-CERTIFICATION.md](./PX1-VISUAL-CERTIFICATION.md)
3. Fix any category <9.5
4. Re-score until pass

**Exit:** All categories ≥9.5, DRB unanimous YES on App Store test

### Phase 7 — Engineering gate & release

1. `npm run gate:px1` — engineering + visual smoke
2. Version bump `0.9.0-px1`
3. Documentation finalize
4. Git tag `orderbhojan-v0.9.0-px1`
5. CEO + PM + ARB + DRB sign-off

---

## File change map (OrderBhojan)

| Area | Files | Action |
|------|-------|--------|
| Home | `HomeExperiencePage.tsx`, `HeroHeader.tsx`, etc. | Rebuild |
| Restaurant | `RestaurantExperiencePage.tsx` | Rebuild |
| Menu | `FoodExperiencePage.tsx`, `FoodCardItem.tsx` | Rebuild → BDS FoodRow |
| Search | `SearchExperience.tsx` | Rebuild |
| Profile | `ProfilePage.tsx` | Rebuild |
| Cart | `CartExperiencePage.tsx` | Rebuild |
| Nav | `ExperienceBottomNav.tsx`, `MarketplaceLayout.tsx` | Rebuild → NavIsland |
| CSS | `experience-premium-m65.css` | Delete |
| Motion | `premiumMotion.tsx` | Delete → BDS |
| CSS | `experience-shell.css`, etc. | Consolidate |

**Unchanged:** `features/*/hooks`, `features/*/store`, `marketplace-api`, `featureFlags`, `AppRouter` paths

---

## Quality gates

### `gate:px1` (new script)

**Engineering (must pass):**
- lint + tsc
- unit tests + px1 visual smoke tests
- build + performance smoke (budget TBD + framer-motion)
- responsive + lighthouse + a11y smoke
- BDS certification (100% component adoption, zero local UI)
- M6 regression

**Visual smoke (automated helpers):**
- No `/M[0-9]/` or "mock" copy in dist HTML
- Home hero image aspect ratio check
- All restaurant cards have navigation href
- Profile HTML contains no "UID" or "Firestore"

**Visual certification (manual DRB):**
- All categories ≥9.5 with annotated screenshots

---

## Risk register

| Risk | Mitigation |
|------|------------|
| BDS scope creep | ARB timebox Phase 0; defer non-PX1 components |
| CSS cascade regression | Delete old CSS files, don't layer |
| Performance (motion) | GPU-only transforms; LazyMotion |
| DRB rejects mid-implementation | Phase gates with screenshot review |
| Feature flag paths diverge | Rebuild both mock and discovery presentation |

---

## Rollback

- Tag before PX1: `orderbhojan-v0.8.5-m65`
- BDS v1.0 remains available
- Feature flags unchanged — rollback is presentation-only

---

## Team activation

| Role | Phase 0 | Phase 1–3 | Phase 4–6 |
|------|---------|-----------|-----------|
| Experience Evolution | BDS stories | Screen rebuild | Motion polish |
| DRB | Token + component review | Per-screen screenshot | Certification |
| ARB | BDS API approval | Compliance check | Gate review |
| Performance | — | LCP monitoring | Bundle audit |
| A11y | Token contrast | Screen reader pass | Final audit |
| QA | Storybook | Journey testing | Full matrix |
| Release Manager | — | — | Tag + notes |

---

## Stop condition

After `gate:px1` + Visual Certification pass → **STOP**.  
Do NOT begin M7 until unanimous CEO + PM + ARB + DRB approval.
