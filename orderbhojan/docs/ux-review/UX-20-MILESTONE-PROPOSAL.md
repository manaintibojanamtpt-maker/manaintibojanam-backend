# UX-2.0 Milestone Proposal (M6.6)

**Status:** Proposed — **blocked pending CEO approval of Product Experience Review**  
**Target version:** `0.8.6-ux20` (or `0.9.0-ux20` if DRB prefers minor bump)  
**Scope:** Product polish ONLY

---

## Mission

Transform OrderBhojan from a **styled React prototype** into a **world-class premium food ordering experience** that passes the Visual Gate at 9/10 across all categories.

**No business logic. No APIs. No M7.**

---

## Prerequisites

- [x] Product Experience Review complete (`docs/ux-review/`)
- [ ] CEO approval of review
- [ ] Design Review Board approval of redesign backlog
- [ ] BDS v1.1 token + component plan approved by ARB

---

## Quality gates

### Engineering Gate (existing)

TypeScript · ESLint · Unit tests · Architecture compliance · A11y smoke · Performance · Responsive · Bundle · BDS certification · M6 regression

### Visual Gate (NEW — `gate:ux20`)

Each category scored by automated smoke + Design Board manual review. **Minimum 9/10 to pass.**

| Category | Measurement |
|----------|-------------|
| Food Appeal | DRB scorecard + no hero-without-food on home |
| Native Feel | Navigation coherence smoke + no milestone copy lint |
| Typography | Token-only type + hierarchy smoke |
| Spacing | 8pt grid smoke + section gap assertions |
| Motion | Fly-to-cart + reduced-motion tests |
| Hierarchy | One-hero-per-viewport smoke |
| Dark Mode | Warm dark token coverage smoke |
| Safe Areas | Existing lighthouse smoke |
| Brand Consistency | MIB warmth token adoption |
| Appetite Score | Image ratio smoke (≥50% food cards) |
| Premium Score | Aggregate DRB sign-off |

**Failure of any category = milestone incomplete**, regardless of engineering gate.

---

## Implementation phases

### Phase 1 — Critical (Week 1–2)

- C1–C8 from [PRIORITY-REDESIGN-BACKLOG.md](./PRIORITY-REDESIGN-BACKLOG.md)
- BDS v1.1 warm tokens
- Remove `--ob-m65-*` duplication

### Phase 2 — High (Week 2–4)

- H1–H10: FoodRow, warm glass, haptics, fly-to-cart, home redesign
- BDS new components: `FoodRow`, `ImmersiveHero`, `GlassSurface`

### Phase 3 — Medium (Week 4–5)

- Tablet/desktop layouts
- Shared hero transitions
- Premium empty states

### Phase 4 — Low / delight (Week 5–6)

- Carousel physics, particles, regional copy
- Design Board final review

---

## Deliverables

| Output | Description |
|--------|-------------|
| Premium Home v2 | Food-first immersive |
| Premium Restaurant v2 | Compressed, focused |
| Premium Menu v2 | FoodRow mobile, sidebar tablet |
| Premium Profile v2 | Consumer shell |
| Premium Cart/Orders v2 | Visual shells |
| BDS v1.1 | Tokens + components |
| `gate:ux20` | Engineering + Visual gate script |
| Before/After v2 | DRB comparison |
| Release notes | UX-2.0 |

---

## Explicit exclusions

- M7 Order Composer
- Checkout logic
- Orders backend
- Payments
- Marketplace API changes
- Firebase / auth logic
- Routing architecture changes (wire existing routes only)

---

## Stop conditions

1. **Do NOT start UX-2.0 until CEO approves this review**
2. **Do NOT start M7 until UX-2.0 achieves Design Board approval (Visual Gate 9/10)**
3. After UX-2.0 gate passes — STOP and await CEO M7 directive

---

## Success criteria

When opening OrderBhojan, a first-time customer says:

> **"This looks amazing — I want to order food."**

Not:

> "Nice React app" or "Is it still loading?"

---

## Approval

| Role | Signature | Date |
|------|-----------|------|
| CEO | _______________ | |
| Product Manager | Review submitted | 2026-07-04 |
| Design Review Board | Visual Gate FAILED — redesign required | 2026-07-04 |
| Architecture Review Board | No architecture changes in scope | 2026-07-04 |
| Release Manager | Pending CEO approval | |
