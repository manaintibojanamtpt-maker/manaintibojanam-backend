# Lighthouse Baseline — 2D UX States

**Routes:** `/` (error/empty/offline states), `/search` (no-results, browse error)  
**Date:** 2026-07-10

## Capture steps

1. Enable discovery + search feature flags
2. Simulate states:
   - **Offline:** DevTools → Network → Offline
   - **Error:** Block API domain or use MSW error override
   - **Empty:** Filter to zero results or empty mock query
   - **Load-more error:** Throttle/block pagination endpoint
3. Run Lighthouse Accessibility focus at each viewport

## Key audit checks

- Error panels: `role="alert"` + `aria-live="polite"`
- Loading skeletons: `aria-busy="true"` + descriptive `aria-label`
- Retry buttons: visible focus ring, keyboard activatable
- Offline banner: `role="alert"` + `aria-live="assertive"`
- Color contrast on `GlassCard` state panels

## Recorded scores

| State | Viewport | Accessibility | Notes |
|-------|----------|---------------|-------|
| Home error | Mobile | _pending capture_ | Retry button focus |
| Home offline | Mobile | _pending capture_ | Banner + state panel |
| Search no-results | Desktop | _pending capture_ | Clear search CTA |
| Browse error | Tablet | _pending capture_ | Retry browse |
