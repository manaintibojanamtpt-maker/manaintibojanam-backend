# Current UX Audit

**Scope:** What users actually experience in OrderBhojan v0.8.5-m65  
**Method:** Code review + interaction path analysis (not self-reported milestone docs)

---

## Scoring rubric (0–10)

| Score | Meaning |
|-------|---------|
| 9–10 | World-class — Apple/Airbnb tier, shippable |
| 7–8 | Good — minor polish gaps |
| 5–6 | Acceptable prototype — not premium |
| 3–4 | Below bar — breaks trust or delight |
| 0–2 | Unacceptable |

**Visual Gate threshold:** Each category must score **≥ 9** to pass UX-2.0.

---

## Screen scores

| Screen | Visual | Native Feel | Appetite | Motion | A11y | Responsive | **Overall** | Ship? |
|--------|--------|-------------|----------|--------|------|------------|-------------|-------|
| **Home** | 6.5 | 6.0 | 6.5 | 7.0 | 7.5 | 7.0 | **6.4** | ❌ |
| **Restaurant** | 7.5 | 6.5 | 7.0 | 7.0 | 7.0 | 7.5 | **7.1** | ❌ |
| **Menu** | 7.5 | 7.0 | 8.0 | 7.5 | 7.5 | 7.0 | **7.4** | ❌ |
| **Search** | 6.0 | 5.5 | 5.0 | 6.0 | 7.0 | 6.5 | **5.8** | ❌ |
| **Profile** | 4.0 | 3.0 | 2.0 | 4.0 | 6.5 | 5.0 | **3.6** | ❌ |
| **Cart** | 5.0 | 4.0 | 4.0 | 5.0 | 7.0 | 5.5 | **4.6** | ❌ |
| **Orders** | 5.5 | 4.5 | 3.5 | 5.0 | 7.0 | 5.5 | **4.8** | ❌ |
| **Bottom Nav** | 7.5 | 7.5 | N/A | 8.0 | 8.0 | 7.0 | **7.6** | ❌ |
| **Hero Banner** | 6.5 | 6.0 | 6.0 | 6.5 | 7.0 | 7.0 | **6.4** | ❌ |
| **Restaurant Cards** | 7.0 | 5.5 | 7.0 | 6.5 | 7.5 | 7.0 | **6.6** | ❌ |
| **Food Cards** | 7.5 | 7.0 | 7.5 | 7.5 | 7.5 | 7.0 | **7.3** | ❌ |
| **Floating Cart** | 6.5 | 5.5 | 6.0 | 6.0 | 7.5 | 6.5 | **6.1** | ❌ |
| **Address Picker** | 7.0 | 7.0 | N/A | 6.5 | 8.0 | 7.0 | **7.1** | ❌ |
| **Category Rail (Home)** | 6.5 | 5.0 | 6.0 | 6.5 | 7.5 | 7.0 | **6.1** | ❌ |
| **Category Rail (Menu)** | 8.0 | 8.0 | 7.5 | 7.5 | 8.0 | 7.5 | **7.8** | ❌ |
| **Bottom Sheet** | 7.5 | 7.5 | N/A | 7.0 | 8.0 | 7.5 | **7.5** | ❌ |
| **Loading / Skeletons** | 5.0 | 4.0 | 3.0 | 5.0 | 7.0 | 6.0 | **4.7** | ❌ |
| **Dark Mode** | 6.0 | 6.0 | 6.0 | 6.0 | 7.0 | 6.5 | **6.1** | ❌ |
| **Tablet** | 6.0 | 5.5 | 6.0 | 6.0 | 7.0 | 6.0 | **6.0** | ❌ |
| **Desktop** | 5.5 | 5.0 | 5.5 | 5.5 | 7.0 | 5.5 | **5.5** | ❌ |
| **Landscape / Foldables** | 5.5 | 5.0 | 5.5 | 5.5 | 7.0 | 5.0 | **5.4** | ❌ |

---

## Visual Gate category scores (aggregate)

| Category | Score | Pass (≥9)? |
|----------|-------|------------|
| Food Appeal | 6.5 | ❌ |
| Native Feel | 5.8 | ❌ |
| Typography | 6.8 | ❌ |
| Spacing | 6.5 | ❌ |
| Motion | 7.0 | ❌ |
| Hierarchy | 6.8 | ❌ |
| Dark Mode | 6.1 | ❌ |
| Safe Areas | 8.0 | ❌ |
| Brand Consistency | 6.0 | ❌ |
| Appetite Score | 6.0 | ❌ |
| Premium Score | 5.8 | ❌ |

---

## Home — detailed findings

**Strengths:** M65 greeting typography, glass category pills, motion reveals, safe-area shell, warm gradient background.

**Failures:**
- Four permanent skeleton rails (`SkeletonRestaurantSection`) never resolve — users see endless loading on mock path
- Mock restaurant tiles do not navigate (`MarketplaceRestaurantTile` has no link)
- Home search is read-only; user must tap separate search icon
- Trending chips under search have no handlers — decorative
- Category rail selection does not filter feed
- Hero banner CTA is inert
- Competes with MIB: no cinematic food hero — greeting + carousel feels like SaaS dashboard

---

## Restaurant — detailed findings

**Strengths:** Cinematic full-bleed hero, parallax, glass collapsing header, logo overlap, sticky "Open Menu" CTA.

**Failures:**
- Brochure-length scroll with "coming soon" Reviews/Recommended mid-flow
- Call/Direction buttons disabled but visually enabled
- Bottom nav disappears — context switch feels webby
- Inline styles instead of tokenized layout
- Search path: results refine query instead of navigating to restaurant

---

## Menu — detailed findings

**Strengths:** Best surface in the app. Sticky category rail + scroll spy, large 16:11 imagery, ribbons, blur-up, glass header collapse, bottom preview bar.

**Failures:**
- "AI" badge on every card — unfinished feature marketing
- "Preview only — checkout arrives in M7" breaks immersion
- Floating preview checkout is noop
- Vertical grid on mobile feels catalog/dashboard, not Swiggy/Uber Eats row appetite layout
- Customize sheet collects special instructions but does not persist them

---

## Profile / Cart / Orders — detailed findings

**Profile:** Displays Firestore UID, "M1" milestone copy, disabled settings list — reads as internal admin panel. **No M65 styling.**

**Cart:** "Mock cart shell only — checkout arrives in a later milestone" — explicit prototype language.

**Orders:** Functional empty state but no premium treatment; milestone-adjacent copy.

---

## Cross-cutting failures

1. **Implementation completeness ≠ product excellence** — gates pass; experience does not
2. **Milestone scaffolding visible** — M1, M7, "coming soon" copy in user paths
3. **Navigation incoherence** — tab bar vanishes on restaurant/menu; search doesn't route
4. **Dual cart semantics** — `cartPreviewStore` vs `foodPreviewStore`; global mock count on trending tiles
5. **MIB emotional DNA missing** — no regional warmth, no food-as-hero, no haptics, no script accent
6. **CSS cascade debt** — `experience-shell`, `experience-premium`, `experience-premium-m65` fight for layout control

---

## Recommendation

**Reject current experience for premium release.** Do not patch with small CSS fixes. Proceed to UX-2.0 full redesign per [PRIORITY-REDESIGN-BACKLOG.md](./PRIORITY-REDESIGN-BACKLOG.md).
