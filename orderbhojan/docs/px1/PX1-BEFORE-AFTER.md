# PX1 Before / After

**Program:** PX1  
**Status:** Baseline documented — **after screenshots pending Stage 4**

---

## Program-level transformation

| Dimension | Before (v0.8.5-m65) | After (v0.9.0-px1 target) |
|-----------|----------------------|---------------------------|
| First impression | "Good morning, Guest" | Full-bleed food hero |
| Home feel | Dashboard with skeleton rails | Immersive marketplace |
| Menu layout | Vertical grid + M7 copy | FoodRow + silent preview cart |
| Profile | Firestore UID debug panel | Consumer account shell |
| Search | Dead-end results | Instant navigation |
| Navigation | Tab bar vanishes | NavIsland + MiniNavIsland |
| Dark mode | Neutral gray | MIB warm luxury |
| Motion | Decorative reveals | Fly-to-cart + shared hero |
| Copy tone | Milestone scaffolding | Human, appetite-driven |
| Premium score | 5.8 / 10 | ≥9.5 / 10 |

---

## Screen-by-screen

### Home

| Aspect | Before | After |
|--------|--------|-------|
| Hero | Promo carousel, 25% food opacity | 62vh full-bleed food, craving copy |
| Search | Read-only, separate nav tap | Floating glass pill, direct focus |
| Rails | 4 permanent skeletons | Live cards or 2s→empty |
| Cards | Mock tiles don't navigate | All tiles → restaurant |
| Greeting | Dominates viewport | Contextual chip only |

### Restaurant

| Aspect | Before | After |
|--------|--------|-------|
| Length | 10+ brochure sections | 5 focused blocks |
| Placeholders | Reviews/Recommended "coming soon" | Hidden until ready |
| Actions | Disabled Call/Direction visible | Hidden until live |
| Nav | Bottom nav gone | MiniNavIsland |
| CTA | Sticky footer | FloatingCTA + shared hero |

### Menu

| Aspect | Before | After |
|--------|--------|-------|
| Layout | Vertical 16:11 cards | FoodRow horizontal mobile |
| Badges | AI on every item | Semantic bestseller/chef only |
| Copy | "checkout arrives in M7" | Silent locked checkout |
| ADD | Scale press | Fly-to-cart + haptic |
| Categories | Sticky rail ✓ (keep) | + vertical sidebar tablet |

### Search

| Aspect | Before | After |
|--------|--------|-------|
| Field | 3 disabled icons | Clean single field |
| Results | Sets query text | Navigates to destination |
| Browse | Good chips | + collection photo cards |

### Profile

| Aspect | Before | After |
|--------|--------|-------|
| Content | UID, providers, M1 copy | Name, tiles, preferences |
| Settings | 4 disabled buttons | Real sections or hidden |
| Style | No M65/PX1 treatment | Warm glass hero |

### Cart

| Aspect | Before | After |
|--------|--------|-------|
| Copy | "Mock cart shell only" | Premium line items + photos |
| Items | Count only | FoodRow + stepper + BillSummary |
| Checkout | Text about M7 | Elegant locked Proceed |

---

## Screenshot slots (DRB)

After implementation, attach side-by-side:

```
docs/px1/screenshots/
  home-mobile-light-before.png
  home-mobile-light-after.png
  ...
```

**Required pairs:** 7 screens × 6 variants (mobile/tablet/desktop × light/dark) = 42 after shots + 42 before reference.

---

## App Store test

| Screen | Before | After target |
|--------|--------|--------------|
| Home | NO | YES |
| Restaurant | NO | YES |
| Menu | NO | YES |
| Search | NO | YES |
| Profile | NO | YES |
| Cart | NO | YES |
