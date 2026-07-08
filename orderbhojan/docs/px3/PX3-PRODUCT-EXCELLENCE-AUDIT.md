# PX3 Product Excellence Audit

**Program:** PX3 — Product Excellence Organization  
**Version under review:** `0.9.0-px2`  
**Date:** 2026-07-04  
**Authority:** Chief Product Designer · DRB · App Store Review Board (virtual)  
**Verdict:** **NOT CERTIFIED — STOP**

---

## Executive declaration

**Engineering Gate:** PASS (`gate:px2` — TypeScript, ESLint, tests, build, BDS wiring)  
**Visual Gate:** **FAIL**  
**Motion Gate:** **FAIL**  
**Interaction Gate:** **FAIL**  
**Consumer Gate:** **FAIL**  
**App Store Gate:** **FAIL**  
**Executive Gate:** **FAIL**

> Passing automated engineering gates does **not** constitute product completion.  
> **PX3 Product Excellence is NOT certified.**

---

## Composite score

| Dimension | Score | Gate |
|-----------|------:|------|
| Visual Quality | 6.4 | FAIL |
| Typography | 6.8 | FAIL |
| Hierarchy | 6.2 | FAIL |
| Spacing | 6.5 | FAIL |
| Motion | 5.5 | FAIL |
| Navigation | 6.9 | FAIL |
| Food Appeal | 4.8 | FAIL |
| Trust | 6.0 | FAIL |
| Interaction | 6.1 | FAIL |
| Accessibility | 7.2 | FAIL |
| Performance | 7.8 | FAIL |
| **Overall** | **6.3 / 10** | **FAIL** |

Threshold: **9.5** on every screen dimension. Nothing meets threshold.

---

## Benchmark question (brutal honesty)

| Would they ship this? | Home | Restaurant | Menu | Search | Cart | Profile | Auth |
|----------------------|:----:|:----------:|:----:|:------:|:----:|:-------:|:----:|
| Apple Editors' Choice | NO | NO | NO | NO | NO | NO | NO |
| Airbnb | NO | NO | NO | NO | NO | NO | NO |
| Uber Rider | NO | NO | NO | NO | NO | NO | NO |
| DoorDash / Deliveroo | NO | NO | NO | NO | NO | NO | NO |
| Shopify Shop | NO | NO | NO | NO | NO | NO | NO |
| Arc / Linear | NO | NO | NO | NO | NO | NO | NO |

**None.** OrderBhojan has structure but not soul, photography, or ritual.

---

## Appetite test (Home)

**Question:** Does the user feel "I'm hungry" within 2 seconds?

**Result:** **FAIL**

- Hero uses `placehold.co` colored rectangle with text — not food photography
- User reads labels ("NEAR YOU", "Hyderabadi Dum Biryani", trust captions) before feeling hunger
- Restaurant rails show giant placeholder typography inside images ("Mana Inti", "Biryani")
- **Food-first principle violated:** interface and copy dominate; appetite imagery is absent

---

## Restaurant test

**Question:** "I'm entering a premium restaurant" vs "another webpage"

**Result:** **FAIL** (partial structure only)

- `RestaurantHero` exists but cover is placeholder
- Page reads as **scrollable brochure** (hours, serviceability, policies) not immersive entry
- Missing: cinematic cover treatment, offer banners as designed, chef story photography, menu preview FoodRows
- `FloatingCTA` present — one of few passes

---

## Menu test

**Question:** Food photography dominates; add feels exciting

**Result:** **FAIL** (best relative screen ~7.0)

- Menu uses `FoodRow` — correct PX1.5 component
- Food images still placeholders / low-quality mock URLs
- No `FlyToCart` motion on add (frozen in MOTION-SPECIFICATION)
- Customize sheet functional but not delight-grade (no hero image in sheet per prototype)
- Grid layout persists on some breakpoints vs horizontal appetite rows everywhere

---

## Profile test

**Result:** **FAIL** (improved from prior audit)

- Consumer shell rebuilt — no UID in profile page ✓
- Still generic: inline styles, grid tiles without icons/photography, no order history richness
- Does not feel **personal** like Airbnb/Uber account — feels **template**

---

## Search test

**Result:** **FAIL**

- `PremiumSearch` sticky variant present
- Voice/camera/AI removed in PX2 — below frozen interaction spec ambition
- Browse state acceptable; results transition not premium
- Feature-flag off path still shows "Search coming soon" milestone copy (`MockSearchExperiencePage`)

---

## Motion test

**Result:** **FAIL**

| Spec (PX1.5) | Implemented |
|--------------|-------------|
| Page enter 400ms spring | Partial (`MotionPage`) |
| Shared hero layoutId | **Missing** |
| Fly-to-cart 400ms | **Missing** |
| Press 120ms scale | Partial (`MotionPress`) |
| Bottom sheet spring | Basic `BottomSheet` |
| Theme crossfade 200ms | Partial |
| Reduced motion paths | Present in CSS |

Decorative motion absent (good) but **purposeful motion incomplete** — no cart ritual, no context continuity.

---

## Visual diff summary (Expected PX1.5 vs Current UI)

| Screen | Expected (Blueprint) | Current | Diff | Pass |
|--------|---------------------|---------|------|:----:|
| Home mobile | 40vh food hero, real photography, search in hero | Structure matches; **placeholder hero & cards** | Photography, trust icons, script accent | FAIL |
| Home dark | `#070504` luxury | Dark theme locked in PX2 fix | Light mode / foodLight untested | FAIL |
| Restaurant | 45vh cover, logo overlap, offer rail | Hero shell; **placeholder cover** | Gallery, offers polish, reviews hidden | FAIL |
| Menu | FoodRow 112px min, sticky rail 44px | FoodRow + StickyCategoryRail | Image quality, fly-to-cart | FAIL |
| Search | Sticky PremiumSearch, collections | Basic search chrome | Voice, collection cards, transitions | FAIL |
| Cart | PremiumEmpty + FloatingCart | PremiumEmpty; preview semantics weak | Checkout story, item list UI | FAIL |
| Profile | Personal, warm, photo-led | Glass hero template | Photography, order stats, warmth | FAIL |
| Auth | Premium glass panel | Improved PX2 auth | Still form-like, not brand moment | FAIL |
| Loading | skeleton-state.svg shapes | Generic Skeleton blocks | Shape-matched skeletons | FAIL |
| Empty | PremiumEmpty illustrations | Text-only empty states | Illustration system | FAIL |
| Tablet | Split hero, 2-col grid | SideNav appears; content not reflowed | Full tablet blueprint | FAIL |
| Desktop | SideNav 240px, 65vh hero band | SideNav + padding partial | Hero band, 3-col discovery | FAIL |

---

## Screen-by-screen scores (0–10)

### Home — **6.5 FAIL**

| Visual Quality | Typography | Hierarchy | Spacing | Motion | Navigation | Food Appeal | Trust | Interaction | A11y | Performance |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 6.0 | 7.0 | 6.5 | 6.5 | 6.0 | 7.5 | **4.5** | 5.5 | 6.5 | 7.5 | 8.0 |

**Blockers:** placehold.co everywhere; appetite test fails; trust strip is unstyled text.

### Restaurant — **6.8 FAIL**

| 6.5 | 7.0 | 6.0 | 6.5 | 6.0 | 7.0 | 5.0 | 6.5 | 6.5 | 7.0 | 8.0 |

**Blockers:** brochure scroll; placeholder cover; no emotional entry.

### Menu — **7.0 FAIL**

| 7.0 | 7.5 | 7.0 | 7.0 | 5.5 | 7.5 | 5.5 | 6.5 | 7.0 | 7.5 | 8.0 |

**Blockers:** no fly-to-cart; placeholder food photos; customize sheet below spec.

### Search — **6.4 FAIL**

| 6.5 | 7.0 | 6.0 | 6.5 | 5.5 | 7.0 | N/A | 6.0 | 6.0 | 7.5 | 8.0 |

### Cart — **6.0 FAIL**

| 6.0 | 7.0 | 5.5 | 6.0 | 5.0 | 7.0 | N/A | 5.5 | 5.5 | 7.0 | 8.0 |

### Profile — **7.2 FAIL**

| 7.0 | 7.5 | 7.0 | 7.0 | 6.0 | 7.5 | N/A | 6.5 | 6.5 | 7.5 | 8.0 |

### Auth — **7.0 FAIL**

| 7.0 | 7.5 | 7.0 | 7.5 | 6.0 | N/A | N/A | 6.5 | 7.0 | 7.5 | 8.0 |

### Loading / Empty / Error — **5.8 FAIL**

Generic skeletons; milestone placeholders when flags off; no shape-matched loading per `skeleton-state.svg`.

---

## NO PLACEHOLDERS audit — **CRITICAL FAIL**

| Violation | Count / location |
|-----------|------------------|
| `placehold.co` URLs | **60+** across mockCatalog, fixtures, mocks, hero fallbacks |
| Colored rectangles pretending to be food | All restaurant & hero rails |
| Large placeholder text in images | Featured restaurants (user-reported) |
| Milestone copy | `FeaturePlaceholderPage`, `MockSearchExperiencePage`, `FoodRoutePage` when flags off |
| Developer labels | AuthShell when Firebase unconfigured (acceptable dev-only if hidden in prod) |

**This alone blocks App Store Gate.**

---

## PX3 redesign backlog (priority order)

### P0 — Stop-ship (blocks any release)

| ID | Issue | Severity | Fix | Owner |
|----|-------|----------|-----|-------|
| P0-1 | Replace ALL placehold.co with licensed food photography set | Critical | Curated asset pipeline + CDN; blur-up via AppetiteImage | Photography Lead |
| P0-2 | Home appetite test failure | Critical | Hero = real biryani photography; reduce copy; enlarge food | Visual Design |
| P0-3 | Restaurant placeholder covers | Critical | Real cover photos per restaurant mock | Photography Lead |
| P0-4 | Remove milestone/placeholder user strings | Critical | Feature flags → PremiumEmpty or hide routes | PM + Platform |
| P0-5 | Fly-to-cart motion on add | Critical | BDS FlyToCart + wire FoodRowAddButton | Motion Director |

### P1 — Visual gate (9.5 path)

| ID | Issue | Severity | Fix | Owner |
|----|-------|----------|-----|-------|
| P1-1 | Trust strip unstyled text | High | Icon + caption per blueprint | Visual Design |
| P1-2 | Typography: displayHero / script accent unused | High | Apply DESIGN-FREEZE tokens on home hero | Typography Director |
| P1-3 | Tablet/desktop layouts not per blueprint | High | Split hero, 2-col/3-col grids | Senior UX Architect |
| P1-4 | Customize sheet vs prototype | High | Hero image, variant pills, spring sheet | Interaction Designer |
| P1-5 | Search collections & transitions | High | WarmCard browse, suggestion animations | Interaction Designer |
| P1-6 | Shape-matched skeletons | High | Match skeleton-state.svg | Visual Design |
| P1-7 | foodLight theme parity | High | DARK-MODE-SPECIFICATION full pass | Visual Design |

### P2 — Excellence polish

| ID | Issue | Fix | Owner |
|----|-------|-----|-------|
| P2-1 | Shared hero transition restaurant→menu | layoutId spring | Motion Director |
| P2-2 | Haptic feedback on add (Capacitor/PWA) | Platform | Platform |
| P2-3 | Profile personal photography & order stats | Consumer Research | Product Designer |
| P2-4 | Auth brand moment (not form-in-card) | Full-bleed food + glass | Visual Design |
| P2-5 | Voice search affordance (UI shell) | PremiumSearch extension | Interaction Designer |

---

## Mandatory screenshot review status

| Capture | Status |
|---------|--------|
| Home / Restaurant / Menu / Search / Cart / Profile / Auth | **Not captured in CI** — manual review only |
| Dark / Tablet / Desktop / Landscape | **Not verified** |
| vs PX1.5 prototypes | **Not diffed** — visual inspection confirms major gaps |

**Screenshot Review Gate: FAIL**

Action required: automated Playwright screenshot matrix vs `docs/px15/prototypes/*.svg` before next gate.

---

## Comparison: Mana Inti Bojanam DNA

| MIB DNA | OrderBhojan PX2 | Gap |
|---------|-----------------|-----|
| Full-viewport food photography | Placeholder blocks | **Critical** |
| Regional emotional copy | Functional marketplace copy | High |
| Great Vibes script accent | Not loaded | Medium |
| Horizontal appetite rows | FoodRow on menu/trending ✓ | Partial |
| Warm glow on interaction | Primary color only | Medium |
| Single-kitchen intimacy | Multi-restaurant (expected) | N/A |

OrderBhojan inherited **palette** but not **appetite**.

---

## What PX2 actually achieved

PX2 was **engineering translation** — BDS components wired, gates green, milestone copy partially removed. It was **not** product excellence. Structure improved; **emotion did not reach 9.5**.

Do not declare PX2 complete under PX3 rules.

---

## Next steps (organization)

1. **STOP** all M7 / feature milestone work  
2. DRB review of P0 backlog  
3. Photography asset sprint (real food images)  
4. Re-implement P0 screens against prototypes  
5. Screenshot diff CI  
6. Re-run this audit — every screen must score **≥ 9.5**  
7. Only then: **"PX3 Product Excellence Certified"**

---

## Sign-off (virtual board)

| Board | Decision |
|-------|----------|
| Chief Product Designer | **REJECT** |
| Motion Director | **REJECT** |
| App Store Review Board | **REJECT** |
| DRB | **REJECT** |
| CEO | **Pending — do not approve M7 or release** |

---

*This audit supersedes PX2 "complete" claims for product purposes. Engineering artifacts (`gate:px2`) remain valid for code quality only.*
