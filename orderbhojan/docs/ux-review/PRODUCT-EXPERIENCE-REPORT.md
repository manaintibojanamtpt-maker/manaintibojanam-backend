# Product Experience Report

**Focus:** Emotional response, native feel, brand consistency — what users *feel*, not what tests assert.

---

## One-sentence verdict

OrderBhojan looks like a **competent design-system marketplace demo**; it does not yet make users **crave food**.

---

## Emotional response map

| Moment | Intended feeling | Actual feeling |
|--------|------------------|----------------|
| Open app | Hunger, anticipation | "Loading sections…" / greeting-first |
| Browse home | Discovery delight | Confusion (skeletons, dead chips) |
| Tap restaurant | Enter a kitchen | Brochure scroll (if you get there) |
| Browse menu | Mouth-watering | Best moment — still undercut by "M7" copy |
| Search food | Effortless find | Dead-end (results don't navigate) |
| View profile | Personal, trusted | Developer debug panel |
| Add to cart | Satisfying ritual | Fake/mock semantics |

**Emotional Score: 5.5 / 10**

---

## Native feel assessment

### Signals that feel native ✓
- Floating bottom nav island with spring indicator
- Glass blur on scroll headers
- Bottom sheets for location and customization
- Sticky category rail with scroll-spy
- Safe-area aware layout
- Tap scale feedback (`MotionPress`)
- Blur-up image loading

### Signals that feel like React/web ✗
- Permanent loading skeletons on home
- Read-only search bar with separate navigation to search
- Tab bar disappears on restaurant/menu routes
- Milestone placeholder copy visible ("M7", "M1", "coming soon")
- Disabled buttons styled as enabled
- Profile shows Firestore UID
- Dual cart systems with inconsistent behavior
- No haptic feedback
- No shared element / hero transitions
- Vertical food grid vs industry-standard horizontal appetite rows

**Native Feel Score: 5.8 / 10**

---

## Brand consistency

### Mana Inti Bojanam DNA (source)

| DNA element | MIB | OrderBhojan |
|-------------|-----|-------------|
| Warm brown-black base | ✓ `#070504` | Partial — system theme dilutes |
| Food-as-hero photography | ✓ Full viewport | ✗ Carousel + greeting first |
| Regional emotional copy | ✓ Andhra/Telugu warmth | ✗ Functional marketplace copy |
| Orange glow on interaction | ✓ `--mib-shadow-glow` | Partial — BDS primary only |
| Script accent typography | ✓ Great Vibes | ✗ Not in BDS |
| Single-kitchen intimacy | ✓ | ✗ Multi-restaurant (expected) |
| Haptic cart ritual | ✓ | ✗ |
| Horizontal food rows | ✓ MenuItemCard | ✗ Vertical FoodCardItem grid |

**Brand Consistency Score: 6.0 / 10**

OrderBhojan is **genetically related** to MIB (BDS palette) but **emotionally estranged**. It evolved the marketplace mechanics without evolving the **soul**.

---

## Information density

| Surface | Density | Assessment |
|---------|---------|------------|
| Home | High | Too many rails, chips, skeletons — cognitive load |
| Restaurant | Very high | Brochure sections — should be progressive disclosure |
| Menu | Medium | Appropriate for ordering |
| Search | Medium | Cluttered field icons |
| Profile | Low | But wrong content (UID rows) |

**Principle:** "Less dashboard. More restaurant." — Restaurant page violates this.

---

## Premium perception test

Simulated first-time user journey (mock home path, flags on):

1. **Launch** → Warm gradient, nice greeting → *"Okay, modern app"*
2. **Scroll home** → Skeleton sections forever → *"Is it broken?"*
3. **Tap restaurant card** → Nothing happens → *"Oh, it's a demo"*
4. **Navigate via discovery flag** → Restaurant hero impresses → *"This part is nice"*
5. **Open menu** → Food looks good → *"I'd order if checkout worked"*
6. **See "checkout arrives in M7"** → *"Definitely not production"*
7. **Profile tab** → UID visible → *"Internal tool"*

**Premium Perception: Failed at step 2–3 and 6–7.**

---

## Accessibility (experience layer)

Engineering a11y is adequate (WCAG AA tokens, reduced motion, sr-only headings). **Experience a11y** gaps:

- Disabled controls look enabled (Call, Direction, voice search)
- Loading skeletons without timeout/empty fallback on home
- Color-only dietary indicators need text backup (partially present)
- Focus order on search suggestions unclear

**Experience A11y Score: 7.0 / 10** — passes engineering gate, not experience gate.

---

## What would change the verdict

Not more CSS classes. A **UX-2.0 redesign** that:

1. Makes food photography the emotional anchor on every screen
2. Removes all milestone scaffolding from user-visible copy
3. Unifies navigation so the app never "breaks character"
4. Rebuilds home as immersive marketplace, not dashboard
5. Rebuilds profile/cart/orders as premium shells even when empty
6. Extracts MIB warmth into BDS tokens (brown glass, glow, script accent)
7. Adds haptics + fly-to-cart + hero transitions

---

## Product Manager recommendation

**M6.5 is engineering-complete, product-incomplete.**

Defer M7 indefinitely until UX-2.0 achieves Visual Gate 9/10 across all categories.
