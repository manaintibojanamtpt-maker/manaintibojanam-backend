# Visual Quality Report

**Reviewer:** Design Review Board + Experience Evolution  
**Baseline:** Mana Inti Bojanam DNA → evolved, not cloned

---

## Summary

M6.5 added a **visual veneer** (glass, shadows, large type) but did not achieve **visual excellence**. The app still reads as a component library demo with food photography inserted, not as a food-first emotional experience.

**Visual Quality Score: 6.4 / 10**

---

## Visual hierarchy

| Surface | Assessment | Score |
|---------|------------|-------|
| Home | Greeting dominates over food; carousel is promo-first not appetite-first | 6/10 |
| Restaurant | Hero → identity → offers works; too many equal-weight sections below fold | 7/10 |
| Menu | Strong food-dominant cards; category rail competes with header | 8/10 |
| Search | Field is hero; results list is flat and utilitarian | 5/10 |
| Profile | Card stack with equal weight — no hero moment | 4/10 |

**Issues:**
- Too many sections with identical card chrome — dashboard rhythm
- Operational badges (ETA, fee, AI) compete with food names
- No single focal point per viewport on home (greeting + search + banner + categories)

**Target:** One hero moment per screen. Food or restaurant identity owns the first 60% of viewport attention.

---

## Whitespace & spacing

**Current:** M65 declares 8pt unit (`--ob-m65-space-unit: 8px`) but enforcement is inconsistent. BDS 4px grid and ad-hoc inline styles coexist.

| Pattern | Issue |
|---------|-------|
| Home stack | Sections feel evenly spaced but not luxurious — cramped between rails |
| Restaurant | Dense badge rows; policies/gallery feel stacked without breathing room |
| Menu | Good card internal padding; section gaps too uniform |
| Profile | Default BDS card padding — no premium rhythm |

**Score: 6.5 / 10**

See [SPACING-STRATEGY.md](./SPACING-STRATEGY.md).

---

## Food appetite appeal

**Current:** Photography is larger post-M65 but still secondary to UI chrome on home. Menu cards are strongest.

| Element | Appetite impact |
|---------|-----------------|
| Hero banner | Gradient + 25% opacity food — **weak** vs MIB full-bleed meal |
| Restaurant cover | Strong — cinematic |
| Food cards | Good ratio; ribbons add noise |
| Trending tiles | Small relative to surrounding UI |

**MIB comparison:** MIB uses full-viewport Andhra meal, warm brown-black base, orange glow on hover. OrderBhojan uses system theme + neutral surfaces — **cooler, less hungry**.

**Score: 6.5 / 10**

---

## Typography rhythm

| Element | Current | Target |
|---------|---------|--------|
| Greeting | Large display — good | Keep, add warmth |
| Section labels | BDS subtitle + caption | Too SaaS; need micro-label warmth |
| Food names | body/title mix | Need stronger weight hierarchy |
| Prices | Present but not dominant | Price should punch |
| Milestone copy | bodySm secondary | **Remove entirely from user UI** |

**MIB uses:** Outfit 800–900 display, `font-black uppercase tracking-widest` micro-labels, Great Vibes script accent on hero.

**BDS gap:** No `displayHero` scale above `displayXl`; no emotional script token; label variant too small/subtle.

**Score: 6.8 / 10**

See [TYPOGRAPHY-STRATEGY.md](./TYPOGRAPHY-STRATEGY.md).

---

## Touch ergonomics

| Control | Min target | Status |
|---------|------------|--------|
| Bottom nav items | 48px | ✓ BDS |
| Add button | ~44px | ✓ |
| Category chips | Variable | ⚠️ Some chips < 44px height |
| Favorite heart | 40px | ⚠️ Borderline |
| Disabled Call/Direction | Looks tappable | ❌ Trust violation |
| Search voice/camera/AI | Clutter, disabled | ❌ Remove or hide |

**Score: 7.0 / 10**

---

## Safe area compliance

**Strengths:** `env(safe-area-inset-*)` on shell, bottom nav, sticky footers. Lighthouse smoke validates tokens.

**Gaps:** Full-screen restaurant/menu lose bottom safe-area context when nav hidden. Floating cart offset may conflict on notched devices at certain breakpoints.

**Score: 8.0 / 10** — best category, still not 9.

---

## Animation quality

**Strengths:** Framer Motion spring on nav indicator, page fade, section reveals, MotionPress on Add, blur-up images, reduced-motion respected.

**Gaps:**
- No shared element transitions (hero → detail)
- No fly-to-cart (MIB has this)
- Hero carousel opacity-only — not native carousel physics
- No haptic feedback layer
- Skeleton shimmer generic — not food-shaped placeholders

**Score: 7.0 / 10**

---

## Image dominance

| Surface | Image % of card | Target |
|---------|-----------------|--------|
| Food card (menu) | ~55% | 65–70% |
| Restaurant tile | ~40% | 50%+ |
| Home banner | Background at 25% opacity | Full-bleed dominant |
| Trending food | BDS FoodCard default | Larger, edge-bleed |

**Score: 6.5 / 10**

See [IMAGE-STRATEGY.md](./IMAGE-STRATEGY.md).

---

## Color harmony

BDS palette is MIB-derived (warm orange `#FF7A00`, cream `#FFFAF3`, brown-black `#070504`) but OrderBhojan applies it through **neutral surfaces** and **system theme**, losing MIB's candlelit warmth.

**Issues:**
- Light mode feels generic marketplace, not premium food
- Glass surfaces neutral-gray, not brown-tinted (`mib-glass`)
- Too many badge colors (AI, offer, veg, best seller) — visual noise
- Dark mode partial — home tiles don't get M65 warm radial treatment

**Score: 6.0 / 10**

---

## Borders & chrome

M6.5 reduced hard borders — good progress. Remaining chrome:
- Card borders on profile/account
- BDS default `border-subtle` on some surfaces
- Search field icon cluster (3 disabled buttons)
- Section card wrappers on restaurant page

**Principle violation:** "Less UI. More food." — still too much software visible.

---

## Verdict

Visual polish improved from M6 → M6.5 but **did not cross the premium threshold**. The gap is structural (layout, hierarchy, emotional warmth), not incremental CSS.

**Design Board recommendation:** Full UX-2.0 redesign — not M6.5 patch cycle.
