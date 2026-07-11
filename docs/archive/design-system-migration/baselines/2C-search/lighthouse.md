# Lighthouse Baseline — 2C Search

**Route:** `/search`  
**Date:** 2026-07-10

## Capture steps

1. Enable search feature flag
2. Capture browse state (empty query) at each viewport
3. Type query (e.g. "biryani") — capture results state
4. Open autocomplete dropdown — capture suggestions overlay

## Key audit checks

- Search input: label / sr-only heading
- Autocomplete listbox: keyboard navigable
- Filter chips: contrast on active state
- Result cards: link names descriptive
- Bottom nav clearance: `pb-24` on main

## Recorded scores

| Viewport | State | Performance | Accessibility | Best Practices | SEO |
|----------|-------|-------------|---------------|----------------|-----|
| Desktop | Browse | _pending_ | _pending_ | _pending_ | _pending_ |
| Desktop | Results | _pending_ | _pending_ | _pending_ | _pending_ |
| Tablet | Browse | _pending_ | _pending_ | _pending_ | _pending_ |
| Mobile | Browse | _pending_ | _pending_ | _pending_ | _pending_ |
| Mobile | Autocomplete open | _pending_ | _pending_ | _pending_ | _pending_ |

## Functional regression (automated)

| Test | Result |
|------|--------|
| `tests/m4-search.test.ts` | PASS |
| `tests/px2-design-implementation.test.ts` | PASS |
| Debounce / React Query | Unchanged (no test regression) |
