# PX1 Accessibility Report

**Program:** PX1  
**Stage:** 5 template — **pending implementation**  
**Owner:** Accessibility (11)

---

## Standard

**WCAG 2.1 AA** minimum. PX1 Visual Certification includes accessibility at **≥9.5**.

---

## PX1 requirements

### Visual
- Contrast ≥4.5:1 body text on warm dark surfaces
- Contrast ≥3:1 large text / UI components
- Focus visible ring on all interactives (BDS default — verify on warm glass)
- No information by color alone (veg/non-veg + text label)

### Interaction
- Touch targets ≥48×48px (BDS `--bds-space-touch-min`)
- **No disabled buttons that look enabled** (PX1 removes Call/Direction/voice until live)
- Skip link to main content on all pages
- Search suggestions: keyboard navigable (↑↓ Enter Esc)

### Motion
- `prefers-reduced-motion: reduce` → instant or opacity-only
- No vestibular triggers (parallax disabled in reduced motion)
- Auto-carousel respects reduced motion (static first slide)

### Screen readers
- sr-only h1 per page (keep)
- Restaurant hero: alt text on cover and logo
- FoodRow: aria-label "Add {name} to cart"
- Cart stepper: aria-live polite on quantity change
- Bottom sheet: focus trap + return focus on close

### Profile
- **Remove UID from DOM entirely** — not aria-hidden, gone

---

## Before (m65) gaps

| Issue | Severity |
|-------|----------|
| Disabled Call/Direction look tappable | High |
| Infinite skeletons no timeout announcement | Medium |
| Search suggestion focus order unclear | Medium |
| Profile UID visible | High |

---

## Test matrix (post-implementation)

- [ ] VoiceOver iOS — full journey home→menu→cart
- [ ] TalkBack Android — same
- [ ] Keyboard-only desktop — all screens
- [ ] Windows High Contrast mode
- [ ] 200% text zoom — no overflow clipping
- [ ] axe-core CI on all route shells

---

## Certification score target

**Accessibility category: ≥9.5**

**Status:** ☐ Not certified — pending Stage 4
