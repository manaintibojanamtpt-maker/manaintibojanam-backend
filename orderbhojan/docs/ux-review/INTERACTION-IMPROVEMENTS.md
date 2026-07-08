# Interaction Improvements

**Scope:** Visual/interaction layer only — no business logic changes in UX-2.0 unless navigation wiring is presentation-critical.

---

## Navigation coherence

| Issue | Fix |
|-------|-----|
| Tab bar vanishes on restaurant/menu | **Contextual NavIsland** — mini floating bar or slide-back gesture hint |
| Mock restaurant tiles don't navigate | Wire all tiles to restaurant route (presentation routing, existing paths) |
| Search results don't navigate | Result row tap → `/restaurant/:slug` (existing route) |
| Home search read-only | Single tappable search that expands inline OR direct focus transfer |
| Back from menu loses restaurant context | Breadcrumb-free but preserve scroll position on back |

---

## Touch feedback

| Interaction | Current | Target |
|-------------|---------|--------|
| Add to cart | MotionPress scale | Scale + haptic light + fly-to-cart |
| Bottom nav tap | Spring indicator | Haptic selection + indicator |
| Favorite toggle | CSS burst class | Haptic success + particle burst |
| Category chip select | Visual only | Haptic light + feed scroll (visual filter state) |
| Pull-to-refresh | None | Elastic overscroll + haptic on release (home) |

---

## Disabled affordances

**Remove from UI until functional** (not `disabled` styling):

- Search: voice, camera, AI buttons
- Restaurant: Call, Direction (or show with "Soon" micro-label outside button)
- Profile: Settings rows (hide section entirely vs disabled list)

---

## Cart interaction

| Issue | Fix |
|-------|-----|
| Dual stores visually inconsistent | Single FloatingCart presentation |
| Menu checkout noop | Button shows elegant locked state with animation, not undefined handler |
| Trending tile shared quantity | Visual-only fix: per-tile local state in UX-2.0 shell |
| Cart page text-only | Line item rows with images + steppers (mock data) |

---

## Scroll interactions

| Surface | Enhancement |
|---------|-------------|
| Restaurant hero | Parallax + collapse header (exists — tune threshold) |
| Menu | Category rail scroll-spy (exists — add haptic on section change) |
| Home | Hide nav on scroll down, reveal on scroll up (MIB pattern) |
| Search | Sticky field compresses on scroll |

---

## Gesture readiness

- Swipe back on restaurant/menu (iOS-style) — CSS `overscroll-behavior` + visual edge shadow
- Swipe favorite on restaurant card (optional delight)
- Long-press food card → quick preview sheet (visual shell)

---

## Focus & keyboard

- Search suggestions: arrow key navigation + Enter to select
- Menu category rail: horizontal arrow key scroll
- Skip link to main content on all pages
- Visible focus ring on all interactive elements (BDS default — verify contrast)

---

## Error & empty interaction

| State | Current | Target |
|-------|---------|--------|
| Home skeleton forever | Infinite | 3s max → curated empty with CTA |
| Search no results | EmptyState | Premium illustration + suggested cuisines |
| Menu unavailable item | Grayed card | Elegant "Sold out" overlay, no Add |
| Location denied | Error text | Warm illustration + manual entry CTA |

---

## Acceptance criteria (UX-2.0)

- Every visible interactive element responds within 100ms
- Zero `disabled` buttons that look enabled
- 100% of cards on home/search navigate somewhere
- Haptic on Add, nav change, favorite (where supported)
