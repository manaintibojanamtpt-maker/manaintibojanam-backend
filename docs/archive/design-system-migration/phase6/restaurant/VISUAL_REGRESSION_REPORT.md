# Phase 6 — Milestone 3A: Visual Regression Report

**Agent:** 3 — Restaurant Experience + Menu Migration  
**Date:** 2026-07-10

## Method

Static comparison of restaurant shell against Founder `MobileRestaurantHeader` visual language and DS primitives.

---

## Hero & identity

| Attribute | Before (BDS) | After (Founder DS) | Match |
|-----------|--------------|---------------------|-------|
| Cover image | `RestaurantHero` immersive | Full-width img + gradient scrim | ✅ |
| Scroll collapse | BDS hero collapse | Height transition `46vh` → `h-28` | ✅ |
| Identity card | Overlay on hero | `GlassCard` + `ProfileImage` | ✅ |
| Trust pills | BDS `Badge` + `TrustVerifiedIcon` | Sparkles / ShieldCheck pills | ✅ |
| Rating | BDS badge row | Amber rating chip | ✅ |
| Poster enter | `enterFromPoster` | Scale transform preserved | ✅ |

---

## Actions & chrome

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| Action bar | `GlassSurface` + BDS `Icon` | `GlassCard` pill + Lucide icons | ✅ |
| Sticky header | BDS `Text` title | Fixed blur header strip | ✅ |
| Favorite burst | CSS class animation | Scale on heart tap | ✅ |

---

## Info sections

| Section | Before | After | Match |
|---------|--------|-------|-------|
| About | BDS `Text` | `SectionHeader` + body text | ✅ |
| Subscription | `GlassSurface` + BDS `Button` | `GlassCard` + `SoftButton` | ✅ |
| Gallery | BDS `Rail` + `AppetiteImage` | Horizontal scroll + lazy `picture` | ✅ |
| Highlights | `GlassSurface` grid | `GlassCard` grid | ✅ |
| Hours | BDS `Text` rows | Section + flex rows | ✅ |
| Policies | BDS caption `Text` | Uppercase labels + body | ✅ |

---

## Menu CTA

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| Component | BDS `FloatingCTA` | Fixed bottom `SoftButton` | ✅ |
| Safe area | CSS class | `env(safe-area-inset-bottom)` | ✅ |
| Disabled when closed | Preserved | Preserved + closed banner | ✅ |

---

## Milestone 3D — UX states

| Surface | Before | After | Match |
|---------|--------|-------|-------|
| Restaurant loading | Raw `Skeleton` blocks | `RestaurantHeroSkeleton` | ✅ |
| Menu loading | Mixed skeleton imports | `RestaurantMenuPageSkeleton` | ✅ |
| Error states | Inline discovery state | `OrderBhojanRestaurantErrorState` / `OrderBhojanMenuErrorState` | ✅ |
| Offline | Not wired | `OrderBhojanDiscoveryOfflineNotice` + offline error copy | ✅ |
| Menu empty | Not shown | `OrderBhojanMenuEmptyState` | ✅ |
| Closed kitchen | CTA disabled only | + `OrderBhojanRestaurantClosedBanner` | ✅ |
| Sold out | BDS / CSS | `MenuItemCardView` "Sold out" label | ✅ |

---

## Responsive

| Breakpoint | Layout | Match |
|------------|--------|-------|
| Mobile | Full-width hero, stacked identity | ✅ |
| Tablet | `max-w-3xl` centered body | ✅ |
| Desktop | Same centered column | ✅ |
