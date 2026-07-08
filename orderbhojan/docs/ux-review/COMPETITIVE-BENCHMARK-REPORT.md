# Competitive Benchmark Report

**Benchmarks:** Apple · Airbnb · Uber Rider · Mana Inti Bojanam  
**Not benchmarked:** Swiggy, Zomato (explicitly excluded per CEO directive)

---

## Methodology

Each dimension scored 1–10 for benchmark apps (reference quality) vs OrderBhojan (current).

---

## Summary matrix

| Dimension | Apple Store | Airbnb | Uber Rider | MIB | **OrderBhojan** |
|-----------|-------------|--------|------------|-----|-----------------|
| Visual hierarchy | 10 | 9 | 9 | 9 | **6.5** |
| Photography dominance | 10 | 9 | 7 | 10 | **6.5** |
| Motion quality | 10 | 8 | 9 | 8 | **7.0** |
| Native feel | 10 | 9 | 10 | 9 | **5.8** |
| Emotional warmth | 8 | 9 | 7 | 10 | **6.0** |
| Information density | 9 | 9 | 9 | 8 | **6.0** |
| Empty/loading states | 10 | 9 | 9 | 8 | **4.5** |
| Typography | 10 | 9 | 9 | 9 | **6.8** |
| Touch ergonomics | 10 | 9 | 10 | 9 | **7.0** |
| Brand consistency | 10 | 10 | 10 | 10 | **6.0** |

---

## Apple Store

**What they do:**
- Product is the hero — edge-to-edge imagery, minimal chrome
- Typography: few sizes, extreme weight contrast, generous line-height
- Motion: shared element transitions, scroll-linked parallax, spring physics
- No visible "loading app" — skeletons match final layout exactly
- Zero developer/debug copy

**OrderBhojan gap:**
- UI chrome competes with food on home
- No shared transitions
- Skeleton rails never resolve
- Milestone copy visible

**Would Apple ship OrderBhojan home?** No.

---

## Airbnb

**What they do:**
- Emotional photography + storytelling copy
- Card discovery with clear affordance (every card navigates)
- Sticky search that expands beautifully
- Trust signals woven into visuals, not bullet lists
- Premium empty states that inspire action

**OrderBhojan gap:**
- Restaurant page is bullet-list brochure vs immersive listing
- Search doesn't complete the discovery loop
- Trust section absent on home
- Empty cart/orders are functional but not inspiring

**Would Airbnb ship OrderBhojan search?** No.

---

## Uber Rider

**What they do:**
- Persistent bottom context — map/activity always reachable
- Single primary action per screen
- Real-time status chips with motion
- Horizontal compact rows for choices
- Haptic confirmation on every action

**OrderBhojan gap:**
- Bottom nav vanishes on restaurant/menu
- Multiple competing CTAs on restaurant page
- No haptics
- Vertical food grid vs compact horizontal rows
- Mock cart breaks trust

**Would Uber ship OrderBhojan menu?** Borderline no — layout wrong, checkout noop.

---

## Mana Inti Bojanam (design DNA)

**What MIB does:**
- Full-viewport cinematic food hero (`src/pages/Home.tsx`)
- Warm brown-black `#070504` — candlelit, not OLED neutral
- `mib-food-card` radial warm gradients + orange glow hover
- Horizontal `MenuItemCard` — text left, photo right, floating ADD
- Great Vibes script on "Cooked" — handcrafted emotion
- Andhra regional copy — "Authentic Andhra Home Kitchen"
- Haptics + fly-to-cart on add
- Floating pill bottom nav with orange active dot
- `mib-glass` brown-tinted blur, not neutral gray

**OrderBhojan gap:**
- Greeting-first home vs food-first hero
- System theme dilutes warm dark luxury
- Vertical image-first cards (different pattern — valid for marketplace but less appetite-triggering on mobile)
- No script accent, no regional warmth in copy
- No haptics, no fly-to-cart
- Glass is neutral, not warm brown

**Is OrderBhojan MIB 3.0?** No — it's MIB 1.5 marketplace port with BDS tokens.

---

## Gap analysis (priority order)

| Gap | vs Benchmark | UX-2.0 priority |
|-----|--------------|-----------------|
| Broken navigation loops | All | Critical |
| Milestone copy in UI | All | Critical |
| Food not hero on home | Apple, MIB | Critical |
| Loading states never resolve | Apple, Uber | Critical |
| No haptics / fly-to-cart | Uber, MIB | High |
| Profile as debug panel | All | Critical |
| Restaurant brochure layout | Airbnb | High |
| Neutral glass vs warm glass | MIB | High |
| Horizontal vs vertical food rows | Uber, MIB | High (mobile) |
| No hero shared transitions | Apple | Medium |
| Desktop/foldable layouts | Apple, Airbnb | Medium |

---

## Competitive positioning statement

**Today:** OrderBhojan is a **BDS showcase** with food marketplace content.

**Target (UX-2.0):** OrderBhojan should feel like **MIB evolved by Apple's HI team for a multi-restaurant world** — warm, hungry, native, zero scaffolding.

---

## Benchmark verdict

OrderBhojan does **not** compete visually with the reference set. It competes with **mid-tier React marketplace templates** that happen to use a good design system.

**Competitive Readiness: 5.5 / 10**
