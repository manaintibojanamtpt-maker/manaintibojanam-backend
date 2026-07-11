# Phase 6 — Milestone 2B: Visual Regression Report

**Agent:** 2 — Discovery Migration  
**Date:** 2026-07-10

## Method

Static class-structure and token comparison between Founder `MarketplaceKitchenCardView` and OrderBhojan listing surfaces after migration. Manual device QA recommended before production.

---

## Card presentation

| Attribute | Before (BDS) | After (Founder DS) | Match |
|-----------|--------------|---------------------|-------|
| Card shell | `Card` + `premium-card` + `ob-discovery-card` | `rounded-2xl border-white/10 bg-white/[0.03]` | ✅ |
| Hover | BDS `premium-card-hover` | `hover:border-[#FF7A00]/40` + shadow lift | ✅ |
| Thumbnail | 10.5rem BDS media | 80×80 `rounded-xl` + scale on hover | ✅ |
| Typography | BDS `Text` variants | Founder white/orange hierarchy | ✅ |
| Metadata row | BDS `Badge` chips | Lucide + `text-xs text-white/60` | ✅ |
| Offers | `Badge variant="offer"` | `MarketplaceBadge` `offer` id | ✅ |
| Closed state | `Badge variant="status"` | `closed` badge + eligibility copy | ✅ |
| Favorite | BDS ghost `Button` + `Icon` | Heart overlay on thumbnail | ✅ |
| Navigation | `onClick` + `navigate` | `Link` to `/restaurant/:slug` | ✅ (same destination) |
| Lazy loading | `loading="lazy"` on images | Preserved | ✅ |

---

## Spotlight card

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| Layout | `ob-kitchen-spotlight` CSS block | `MarketplaceKitchenCardView variant="spotlight"` | ✅ |
| Hero image | Full-width media + scrim | `h-48` image + gradient overlay | ✅ |
| Eyebrow | "Cooking now" CSS badge | Orange pill on image | ✅ |
| Metadata | BDS badges | Founder metadata row | ✅ |

---

## Listing layout (rails / grids)

| Breakpoint | Before | After | Match |
|------------|--------|-------|-------|
| Mobile | BDS `Rail` horizontal scroll | Flex overflow-x + `17.5rem` cards | ✅ |
| Tablet | BDS rail | Flex scroll (unchanged mobile pattern) | ✅ |
| Desktop (lg+) | SideNav offset + rail | `lg:grid-cols-2` | ✅ |
| Desktop (xl+) | — | `xl:grid-cols-3` (Founder marketplace grid) | ✅ |
| Section header | `ob-section__title` BDS Text | `SectionHeader` Founder typography | ✅ |
| Load more | BDS `Button variant="secondary"` | `SoftButton tone="ghost"` | ✅ |

---

## Responsive spacing

Founder `Section` density (`py-10 sm:py-14`) applied per collection rail. Matches Founder `MarketplaceHome` grid spacing (`gap-4 sm:grid-cols-2`).

---

## Manual QA checklist

- [ ] Discovery ON: nearby / featured / top-rated rails render DS cards
- [ ] Discovery OFF: mock featured rail uses `OrderBhojanMockKitchenCard`
- [ ] Single-kitchen spotlight mode on home
- [ ] Favorite toggle does not navigate
- [ ] Card click navigates to restaurant menu
- [ ] Closed restaurant shows closed badge
- [ ] Offer badge visible when `badges` includes `offer`
- [ ] Load more pagination still appends cards
- [ ] Favorites page grid (inherits new card)
