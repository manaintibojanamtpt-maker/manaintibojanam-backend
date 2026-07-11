# Phase 6 — Milestone 3B: Menu Visual Regression Report

**Agent:** 3 — Restaurant Experience + Menu Migration  
**Date:** 2026-07-10

## Method

Static comparison of menu presentation against Founder Store food card patterns and Phase 6 restaurant shell visual language (`#030303` canvas, orange accent, glass surfaces).

---

## Menu header

| Attribute | Before (BDS) | After (Founder DS) | Match |
|-----------|--------------|---------------------|-------|
| Restaurant strip | `ob-menu-px2` header | `GlassCard` + `ProfileImage` | ✅ |
| Back / home | BDS icon buttons | Lucide in glass pill | ✅ |
| Background | PX2 menu classes | `#030303` + glass blur | ✅ |

---

## Category rail

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| Component | BDS `StickyCategoryRail` | `OrderBhojanFoodCategoryRail` | ✅ |
| Sticky behaviour | Preserved | `sticky top-0` + backdrop blur | ✅ |
| Active chip | BDS selected state | Orange border / fill | ✅ |
| Scroll spy | Unchanged hook | Wired to same section IDs | ✅ |

---

## Food cards

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| List row | BDS `FoodRow` | `MenuItemCardView` | ✅ |
| Dietary badge | BDS veg/non-veg | DS dietary indicator | ✅ |
| Price / offer | BDS `Price` | Mapper `priceLabel` | ✅ |
| Add button | `FoodRowAddButton` | `SoftButton` + stepper | ✅ |
| Unavailable | BDS disabled state | `unavailable` VM flag | ✅ |
| Lazy images | Preserved | `loading="lazy"` default | ✅ |

---

## Signature dishes

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| Component | BDS `DishPoster` | `FeaturedMenuItemCardView` | ✅ |
| Layout | Horizontal scroll rail | Same | ✅ |
| Add interaction | Preview store + cart | Preserved | ✅ |

---

## Floating cart

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| Component | BDS `FloatingCart` | `GlassCard` + `SoftButton` | ✅ |
| Safe area | CSS | `env(safe-area-inset-bottom)` | ✅ |
| Quantity badge | Preserved | Cart store wired | ✅ |

---

## States

| State | Before | After | Match |
|-------|--------|-------|-------|
| Loading | Inline skeleton | `CategorySkeleton` + `MenuItemSkeleton` | ✅ |
| Error | BDS `Button` retry | `OrderBhojanDiscoveryUxState` | ✅ |
| Empty categories | N/A | Section renders empty list | ✅ |

---

## Responsive

| Breakpoint | Layout | Match |
|------------|--------|-------|
| Mobile | Full-width cards, horizontal signature rail | ✅ |
| Tablet | `max-w-3xl` centered sections | ✅ |
| Desktop | Same centered column as Founder Store | ✅ |

---

## Manual QA (recommended)

```bash
cd orderbhojan && npm run test:screenshots:food
```

Compare against baselines in `docs/design-system-migration/baselines/` when captured.
