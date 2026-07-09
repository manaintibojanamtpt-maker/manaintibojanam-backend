# Design Review Template

> Copy to `orderbhojan/docs/m<N>/DESIGN-REVIEW.md` or `VISUAL-REVIEW.md`.

---

# Design Review — M__ Title

**Milestone:** M__  
**Date:** YYYY-MM-DD  
**Reviewer:** DRB / Experience Evolution  
**Status:** Draft | Approved | Changes Requested

## Design Intent

What emotional and functional experience should this milestone deliver?

- Food-first hierarchy:
- Mobile-first:
- Brand warmth (Bhojan orange):

## Reference

| Reference | What We Borrow | What We Avoid |
|-----------|----------------|---------------|
| Mana Inti Bojanam | | |
| M1.5 / M1.6 patterns | | |
| External inspiration | Craft only — no copying | |

## BDS Compliance

| Component | BDS Import | Custom CSS Layer | Pass |
|-----------|------------|------------------|------|
| Buttons | Button | — | |
| Cards | Card | experience-premium.css | |
| Inputs | Input | — | |

- [ ] No custom Button/Card/Input in app
- [ ] Tokens `--bds-*` used for colors/spacing
- [ ] ThemeProvider wraps affected routes

## Layout & Responsive

| Breakpoint | Behavior |
|------------|----------|
| 375px mobile | |
| 768px tablet | |
| 1024px+ desktop | |

## Dark Mode

- [ ] Tested in dark theme
- [ ] Contrast acceptable
- [ ] Images/gradients adjusted

## States

| State | Design |
|-------|--------|
| Loading | |
| Empty | |
| Error | |
| Guest | |
| Authenticated | |

## Motion (if applicable)

| Interaction | Duration | Easing | Reduced Motion Fallback |
|-------------|----------|--------|-------------------------|
| | | | |

Handoff to Motion agent: ___

## Accessibility Preview

- [ ] Touch targets ≥ 44px
- [ ] Focus visible
- [ ] Keyboard navigable
- [ ] Screen reader labels planned

## Visual Checklist

- [ ] Food photography prominent
- [ ] Whitespace rhythm consistent
- [ ] Bottom nav / header chrome defined
- [ ] Cart affordance clear

## Gaps / BDS Requests

| Gap | Proposed Resolution | Agent |
|-----|---------------------|-------|
| | | Design System |

## Screenshots

Before: _(path or description)_  
After: _(path or description)_

## DRB Sign-Off

| Reviewer | Date | GO / NO-GO / CONDITIONS |
|----------|------|-------------------------|
| DRB | | |
| Experience Evolution | | |

---

*Template: `.cursor/templates/design-review.md`*
