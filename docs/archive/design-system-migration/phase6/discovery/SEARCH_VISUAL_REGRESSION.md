# Phase 6 — Milestone 2C: Search Visual Regression Report

**Agent:** 2 — Discovery Migration  
**Date:** 2026-07-10

## Method

Static class-structure and token comparison between Founder Store search surfaces and OrderBhojan after migration. Device screenshots stored in `docs/design-system-migration/baselines/2C-search/` (manual capture required for PNG assets).

---

## Search bar

| Attribute | Before (BDS `PremiumSearch`) | After (Founder DS) | Match |
|-----------|------------------------------|---------------------|-------|
| Input shell | BDS `PremiumSearch` sticky bar | `MarketplaceSearchBar` rounded pill | ✅ |
| Background page | `ob-search-px2` CSS | `bg-[#030303]` + `Section` gradient hero | ✅ |
| Clear button | BDS inline clear | DS clear affordance | ✅ |
| Submit | Enter / icon tap | Preserved | ✅ |
| Focus ring | BDS focus | Founder orange accent border | ✅ |

---

## Autocomplete dropdown

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| Container | Custom `ob-search-suggestions` listbox | `MarketplaceSearchAutocomplete` | ✅ |
| Suggestion rows | BDS text + icons | Founder typography + Lucide icons | ✅ |
| Match highlighting | Inline bold spans | `HighlightedText` in VM | ✅ |
| Keyboard highlight | Not in BDS flow | Arrow keys + active row state | ✅ (enhanced) |
| ESC close | Partial | Full close + blur | ✅ |

---

## Filter chips

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| Chip shell | BDS `Chip` variants | Founder pill (`border-white/10`, orange active) | ✅ |
| Sort control | BDS `Button` | `SoftButton tone="ghost"` | ✅ |
| Active state | BDS primary chip | Orange border + white text | ✅ |
| Filter logic | `useSearchFilterStore` | Unchanged | ✅ |

---

## Search results

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| Restaurant rows | BDS `Card` / listing card | `OrderBhojanKitchenCard` (2B) | ✅ |
| Food/category rows | BDS compact card | `MarketplaceSearchResultCardView` | ✅ |
| Section headers | BDS `Text` title | `SectionHeader` Founder typography | ✅ |
| Empty state | BDS `EmptyState` | `OrderBhojanDiscoveryStatePanel` | ✅ |
| Error state | BDS alert block | `OrderBhojanDiscoveryStatePanel` + retry | ✅ |
| Loading | BDS `Skeleton` rows | `RecommendedSkeleton` from `SkeletonSystem` | ✅ |

---

## Browse / zero state

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| Recent searches | BDS chip row | Founder chip buttons | ✅ |
| Popular searches | BDS chip row | Founder chip buttons | ✅ |
| Trending foods | BDS list cards | `GlassCard`-style rows + skeleton | ✅ |
| Section layout | `ob-search-platform__body` | `Section` + `max-w-5xl` container | ✅ |

---

## Responsive layout

| Breakpoint | Before | After | Match |
|------------|--------|-------|-------|
| Mobile | Full-width sticky search + stacked results | `px-4` container, horizontal chip scroll | ✅ |
| Tablet | Same as mobile with wider rails | `sm:px-6`, chip wrap | ✅ |
| Desktop | Side nav offset + BDS layout | `lg:px-8`, `max-w-5xl` centered main | ✅ |

---

## Mock search (flag off)

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| Search launcher | BDS `SearchBar` | `MarketplaceSearchBar` (read-only) | ✅ |
| Browse chips | BDS `Chip` | Founder styled spans | ✅ |
| Page background | BDS experience CSS | `#030303` Founder dark | ✅ |

---

## Baseline artifacts

See `docs/design-system-migration/baselines/2C-search/`:

- `dom-tree.json` — component hierarchy snapshot
- `metrics.json` — build bundle metrics
- `lighthouse.md` — capture protocol
- `desktop.png`, `tablet.png`, `mobile.png` — capture at `/search` with feature flag ON

---

## Manual QA checklist (recommended before release)

- [ ] Desktop `/search` — autocomplete, filters, results sections
- [ ] Tablet — chip scroll, result card tap targets
- [ ] Mobile — keyboard open/close, bottom nav clearance (`pb-24`)
- [ ] Mock search page with search flag OFF
- [ ] Deep link with `?q=` query param (if applicable)
