# Priority Redesign Backlog

**Rule:** No small CSS patches. Each item is a **redesign**, not a tweak.  
**Scope:** Visual/UX only — no APIs, routing logic, Firebase, checkout, orders backend.

---

## Critical (blocks premium release)

| ID | Item | Screens | Rationale |
|----|------|---------|-----------|
| C1 | **Remove all milestone scaffolding copy** | All | "M7", "M1", "Mock", "coming soon", Firestore UID — instant prototype signal |
| C2 | **Fix home discovery loop** | Home | Permanent skeleton rails + non-navigating tiles — app feels broken |
| C3 | **Redesign Home as food-first immersive marketplace** | Home | Greeting-first → food-hero-first; MIB 3.0 emotional anchor |
| C4 | **Redesign Profile as consumer shell** | Profile | Admin panel → premium account experience |
| C5 | **Unify navigation context** | Nav, Restaurant, Menu | Tab bar vanishing breaks native feel |
| C6 | **Fix search → restaurant navigation** | Search | Discovery loop dead end |
| C7 | **Redesign Cart as premium shell** | Cart, Floating Cart | Mock language → beautiful cart UI with photos (visual only) |
| C8 | **Eliminate infinite skeleton states** | Home, Loading | Shimmer → empty state after timeout; never permanent |

---

## High (required for Visual Gate 9/10)

| ID | Item | Screens | Rationale |
|----|------|---------|-----------|
| H1 | **Mobile food row layout** (horizontal text + photo + ADD) | Menu, Home | Uber/MIB appetite pattern vs vertical grid |
| H2 | **Restaurant page compression** | Restaurant | Brochure → focused ordering entry (hero + offers + CTA) |
| H3 | **Warm dark theme** (MIB brown-black stack) | All, Dark Mode | Neutral system dark loses food warmth |
| H4 | **Warm glass surfaces** (`mib-glass` equivalent in BDS) | All | Neutral gray glass feels cold |
| H5 | **Remove disabled-but-visible affordances** | Search, Restaurant | Voice/camera/AI icons, Call/Direction — hide until live |
| H6 | **Unified cart presentation** | Cart, Menu, Home | Single visual cart system |
| H7 | **Hero banner full-bleed food** | Home | 25% opacity bg → dominant photography |
| H8 | **Remove AI badge from food cards** | Menu | Visual noise + unfinished feature |
| H9 | **Haptic feedback layer** | Menu, Nav, Cart | Native tactile confirmation |
| H10 | **Fly-to-cart animation** | Menu, Home | MIB ritual — satisfies add action |

---

## Medium (polish for world-class)

| ID | Item | Screens | Rationale |
|----|------|---------|-----------|
| M1 | **Shared element hero transitions** | Home → Restaurant → Menu | Apple-grade continuity |
| M2 | **Food-shaped skeleton placeholders** | All loading | Generic bars → card-shaped shimmer |
| M3 | **Tablet 2-column home grid** | Tablet | Wasted horizontal space |
| M4 | **Menu sidebar category rail** | Tablet, Desktop | Sticky vertical rail on wide screens |
| M5 | **Desktop editorial layout** | Desktop | Phone column on 1920px screens |
| M6 | **Landscape compact layouts** | Landscape | Hero overflow, nav conflicts |
| M7 | **Foldable dual-pane** | Foldables | List + detail simultaneously |
| M8 | **Premium empty states** | Orders, Search, Cart | Inspire action, not document milestones |
| M9 | **Address sheet warm glass + map thumb** | Location | Functional but not premium |
| M10 | **Category rail functional filter** | Home | Cosmetic selection → feed filter (visual state only if logic deferred) |
| M11 | **Orange glow hover on cards** | All cards | MIB `--mib-shadow-glow` warmth |
| M12 | **Script accent typography token** | Home hero | MIB Great Vibes emotional accent via BDS |

---

## Low (delight layer)

| ID | Item | Screens | Rationale |
|----|------|---------|-----------|
| L1 | **Carousel spring physics** | Home banner | Opacity fade → native slide |
| L2 | **Result list stagger animation** | Search | Premium reveal |
| L3 | **Favorite burst particle** | Restaurant | Already partial — enhance |
| L4 | **Parallax on all hero surfaces** | Home, Restaurant | Depth |
| L5 | **Blur transition on theme switch** | Dark mode | Smooth theme change |
| L6 | **Rotating craving copy** | Home | MIB emotional lines |
| L7 | **Trust stats strip** | Home | 4.9★, Hygienic — MIB pattern |
| L8 | **Regional warmth in micro-copy** | All | Functional → emotional |
| L9 | **Prefetch hero images on home** | Home | Instant perceived load |
| L10 | **Button ripple on primary CTAs** | All | Material-native hybrid |

---

## Sequencing for UX-2.0 milestone

```
Phase 1 (Critical): C1–C8 — remove broken/prototype feel
Phase 2 (High):     H1–H10 — appetite + warmth + native patterns
Phase 3 (Medium):   M1–M12 — responsive + delight infrastructure
Phase 4 (Low):      L1–L10 — award-level polish
```

**Estimated UX-2.0 scope:** Phases 1–2 minimum for Visual Gate pass. Phases 3–4 for Design Board excellence.

---

## Explicitly out of scope (CEO directive)

- M7 Order Composer / Checkout logic
- Orders backend / tracking
- Payments
- Marketplace API changes
- Firebase / auth logic changes
- New business features

Visual shells and interaction affordances only.
