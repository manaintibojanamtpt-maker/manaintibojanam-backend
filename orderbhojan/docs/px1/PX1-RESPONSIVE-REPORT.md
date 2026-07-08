# PX1 Responsive Report

**Program:** PX1  
**Stage:** Design + certification template  
**Owner:** QA (13) + Experience Evolution (18)

---

## Breakpoints

| Name | Width | Layout model |
|------|-------|--------------|
| xs | 320–374 | Single column, edge-to-edge |
| sm | 375–767 | Single column, full mobile PX1 |
| md | 768–1023 | Tablet — 2-col home, sidebar menu |
| lg | 1024–1279 | Tablet landscape / small desktop |
| xl | 1280–1439 | SideNav, 3-col discovery |
| 2xl | 1440–1919 | Editorial max 1200px content |
| 3xl | 1920–2559 | Max 1400px content |
| 4xl | 2560+ | Max 1400px centered, generous margins |

**Rule:** No boxed phone column on desktop. Edge-to-edge heroes at all sizes.

---

## Per-screen responsive spec

### Home

| Breakpoint | Layout |
|------------|--------|
| 320–767 | Full-bleed hero 62vh, rails horizontal scroll |
| 768–1023 | Hero 50/50 split, categories 2-row grid, 2-col restaurants |
| 1280+ | SideNav, hero band 65vh, 3-col restaurant grid |

### Restaurant

| Breakpoint | Layout |
|------------|--------|
| 320–767 | 45vh hero, stacked body, FloatingCTA |
| 768–1023 | Sticky hero left 50%, scroll right 50% |
| 1280+ | Gallery left 58%, sticky info panel right 42% |

### Menu

| Breakpoint | Layout |
|------------|--------|
| 320–767 | FoodRow, horizontal category rail |
| 768–1023 | Vertical sidebar rail 240px + FoodRow content |
| 1280+ | Optional cart dock 320px right |

### Search

| Breakpoint | Layout |
|------------|--------|
| 320–767 | Full width field + results |
| 768+ | Field max 640px centered, results 2-col grid |
| 1280+ | Command palette modal centered 720px |

### Profile

| Breakpoint | Layout |
|------------|--------|
| 320–767 | Single column |
| 768+ | Hero + 2-col tiles grid |
| 1280+ | Max 640px centered (intimate) |

### Cart

| Breakpoint | Layout |
|------------|--------|
| 320–767 | Full page |
| 768+ | Max 480px centered or side sheet |
| 1280+ | Right dock sheet 400px optional |

### Navigation

| Breakpoint | Component |
|------------|-----------|
| 320–1279 | NavIsland bottom |
| 1280+ | SideNav left 240px |
| Immersive (all) | MiniNavIsland when bottom hidden |

---

## Landscape phone

- Hero max 40vh (home, restaurant)
- Menu: vertical category rail left 80px
- NavIsland: compact 56px height
- Safe-area left/right on notched landscape

---

## Foldables

| Posture | Layout |
|---------|--------|
| Folded | Standard phone layout |
| Unfolded ≥884px | Dual pane: list 45% + detail 55% |
| Home unfolded | Restaurant list + hero preview |

Implementation: CSS `@media (horizontal-viewport-segments: 2)` where supported + fallback to tablet layout.

---

## Safe areas

All fixed elements use BDS safe utilities:

- NavIsland: `bds-safe-bottom`
- ContextHeader: `bds-safe-top`
- FloatingCTA: `bds-fixed-bottom-safe`
- No content behind Dynamic Island / punch holes

---

## Before (m65) failures

| Issue | Breakpoint |
|-------|------------|
| 48rem max-width cap | 1024+ |
| Phone column on 1920px | Desktop |
| No tablet sidebar menu | 768–1023 |
| Landscape untested | Landscape |

---

## Test devices (certification)

- [ ] iPhone SE (320)
- [ ] iPhone 14 (390)
- [ ] Pixel 7 (412)
- [ ] iPad (820)
- [ ] iPad Pro (1024)
- [ ] MacBook (1280)
- [ ] Desktop (1920)
- [ ] Ultrawide (2560)
- [ ] Galaxy Fold (unfolded)
- [ ] Landscape on iPhone + iPad

---

## Certification

**Responsiveness category target: ≥9.5**

**Status:** ☐ Pending implementation + device matrix
