# Phase 6 — Discovery Accessibility Report

**Agent:** 2 — Discovery Migration  
**Date:** 2026-07-10  
**Covers:** Milestones 2C (Search) + 2D (UX States)

## Summary

Search and UX state presentation preserve functional accessibility patterns. Milestone 2D adds consistent ARIA roles, live regions, and keyboard-accessible retry across all Discovery surfaces. No regressions identified in static review.

---

## Keyboard navigation

| Interaction | Before | After | Status |
|-------------|--------|-------|--------|
| Tab to search input | ✅ | ✅ Auto-focus on mount preserved | ✅ |
| Enter submit | ✅ | ✅ `onSubmit` handler | ✅ |
| Escape clear/close | Partial | ✅ Clears query + closes autocomplete | ✅ |
| Arrow down/up in suggestions | ❌ Not in BDS flow | ✅ `OrderBhojanSearchBar` | ✅ Enhanced |
| Enter on highlighted suggestion | ❌ | ✅ Selects active suggestion | ✅ Enhanced |
| Filter chip keyboard | ✅ Button elements | ✅ `SoftButton` / button chips | ✅ |
| Result row activation | ✅ Link / button | ✅ `OrderBhojanKitchenCard` Link | ✅ |

---

## Focus management

| Area | Implementation |
|------|----------------|
| Page load focus | `useEffect` focuses search input |
| After term selection | `selectTerm` re-focuses input |
| Autocomplete close | Blur / Escape returns focus to input |
| Error retry | `SoftButton` receives focus via native tab order |

---

## ARIA & screen readers

| Element | Attributes |
|---------|------------|
| Page title | `<h1 className="sr-only">Search OrderBhojan</h1>` |
| Error panel | `role="alert"` on `OrderBhojanDiscoveryStatePanel` |
| Search input | Provided by `MarketplaceSearchBar` (DS primitive) |
| Suggestions list | `MarketplaceSearchAutocomplete` listbox pattern |
| Filter chips | Text labels preserved from store (cuisine, veg, rating, …) |
| Empty / no-results | Descriptive `title` + `description` in state panel |

---

## Color contrast

| Token | Usage | Assessment |
|-------|-------|------------|
| `text-white` on `#030303` | Headings, input | ✅ High contrast |
| `text-white/60` | Metadata, hints | ✅ Meets WCAG AA for body text at `text-xs`+ |
| `#FF7A00` accent | Active chips, hover borders | ✅ Sufficient on dark background |
| `border-white/10` | Cards, chips | Decorative; text contrast independent |

---

## Touch targets

| Control | Size |
|---------|------|
| Search bar | Full-width, ≥44px height (DS default) |
| Filter chips | `py-1.5` + padding — meets minimum on mobile |
| Kitchen cards | Full card row tappable (2B) |
| Back / clear / retry | `SoftButton` minimum tap area |

---

## Reduced motion

Founder DS components respect `prefers-reduced-motion` via Tailwind/DS tokens. Search-specific BDS CSS animations removed from hot path.

---

## Verification status

| Check | Method | Result |
|-------|--------|--------|
| Static ARIA review | Code inspection | ✅ PASS |
| Keyboard nav | Unit-level behaviour in `OrderBhojanSearchBar` | ✅ PASS |
| Screen reader | Manual VoiceOver/NVDA on `/search` | ⏳ Recommended pre-release |
| Lighthouse a11y score | See `baselines/2C-search/lighthouse.md` | ⏳ Manual capture |

---

## Known gaps (non-blocking)

| ID | Issue | Severity |
|----|-------|----------|
| A11Y-2C-01 | Live region for async result count not added | Low — section headers convey structure |
| A11Y-2C-02 | Autocomplete `aria-activedescendant` depends on DS primitive | Low — verify in manual QA |

---

## Milestone 2D — UX States

### Loading announcements

| Element | Attributes |
|---------|------------|
| Home feed skeleton | `aria-busy="true"`, `aria-label="Loading home feed"` |
| Search results skeleton | `aria-busy="true"`, `aria-label="Loading search results"` |
| Browse skeleton | `aria-busy="true"`, `aria-label="Loading browse suggestions"` |
| Trending dishes skeleton | `aria-busy="true"`, `aria-label="Loading popular dishes"` |
| Inline spinner | `aria-label` via loading message prop; `motion-reduce:animate-none` |

### Error announcements

| Element | Attributes |
|---------|------------|
| `OrderBhojanDiscoveryUxState` error variants | `role="alert"` (default for error/offline/network/timeout/load-more) |
| Offline notice | `role="alert"`, `aria-live="assertive"` |
| Empty / no-results | `role="status"`, `aria-live="polite"` |

### Retry & focus

| Control | Implementation |
|---------|----------------|
| Retry buttons | `SoftButton` — native focus, visible ring |
| Secondary actions | Ghost `SoftButton` — tab order preserved |
| Load-more retry | Compact inline panel above load-more button |

### Screen reader coverage (2D)

| State | Title + description | Action label |
|-------|---------------------|--------------|
| Discovery home error | ✅ | "Retry" |
| No kitchens empty | ✅ | "Show all kitchens" + optional "Update location" |
| Offline | ✅ Banner + full state panel |
| Search no-results | ✅ | "Clear search" |
| Browse error | ✅ | "Retry" |
| Mock feed error/empty | ✅ (was silent `null`) | Retry / category hint |

### 2D verification

| Check | Result |
|-------|--------|
| Static ARIA on UX state layer | ✅ PASS |
| Retry keyboard access | ✅ PASS |
| Reduced motion on spinner | ✅ PASS |
| Manual screen reader on error states | ⏳ Recommended pre-release |
