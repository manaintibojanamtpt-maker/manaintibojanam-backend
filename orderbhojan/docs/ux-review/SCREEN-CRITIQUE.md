# Screen-by-Screen Critique

**Format:** Equivalent to screenshot review — surface, first impression, failures, redesign direction.

---

## 1. Home

**First impression:** "Modern delivery app header" — not "I'm hungry."

**What users see:**
- Sticky glass header: greeting ("Good morning"), name, location chip, notification bell
- Read-only search bar → must tap search icon separately
- Decorative trending chips (no action)
- Auto-rotating promo carousel (gradient + faint food bg)
- Horizontal category emoji chips
- Featured restaurant rail (if discovery on) OR four permanent skeleton rails
- Trending foods horizontal scroll
- Floating cart pill above bottom nav

**Critique:**
- ❌ Greeting owns top of screen; food is secondary
- ❌ Skeleton rails (`Nearby`, `Top Rated`, `Fast Delivery`, `Offers`) never complete — looks broken
- ❌ Mock restaurant tiles don't tap through
- ❌ Category selection does nothing
- ❌ Hero CTA inert
- ⚠️ Too many horizontal rails — dashboard fatigue
- ✓ Motion reveals feel smooth
- ✓ Bottom nav island is premium

**Redesign:** Full-bleed food hero or immersive restaurant mosaic as viewport 1. Location + search float over imagery. Single curated feed below — no permanent skeletons. Every card navigates.

---

## 2. Restaurant

**First impression:** "Nice landing page" — not "I'm inside a restaurant."

**What users see:**
- Collapsing glass header with back
- Full-bleed cover image + gradient
- Overlapping logo, name, cuisine, rating/ETA/distance/delivery badges
- Offers horizontal rail
- Quick actions: Favorite, Share, Call (disabled), Direction (disabled)
- About, Hours, Serviceability, Gallery, Highlights, Policies
- "Reviews — coming soon" card
- "Recommended — coming soon" card
- Sticky footer: "Open Menu"

**Critique:**
- ✓ Cinematic hero is strongest restaurant pattern in app
- ❌ Too long — brochure not ordering entry
- ❌ Disabled Call/Direction look tappable
- ❌ Placeholder cards mid-scroll destroy trust
- ❌ Bottom nav gone — user loses app context
- ❌ Inline styles signal unfinished polish
- ⚠️ Offers rail competes with hero for attention

**Redesign:** Hero + identity + offers + 3 highlights max above fold. Progressive disclosure for about/policies. Persistent mini-tab or contextual nav. Remove all "coming soon" — hide sections until ready.

---

## 3. Menu

**First impression:** "This is the app" — closest to premium target.

**What users see:**
- Collapsing sticky header (back, title, search icon)
- Restaurant name + "Preview only — ordering arrives in M7"
- Sticky category rail with scroll-spy + item counts
- Featured items horizontal rail
- Category sections with large food cards (image, ribbons, badges, price, Add/stepper)
- "AI" badge on cards
- Fixed bottom preview bar with FloatingCart
- Customize bottom sheet (variants, add-ons, instructions)

**Critique:**
- ✓ Category rail + scroll-spy — native menu pattern
- ✓ Large photography, blur-up, ribbons
- ✓ MotionPress on Add
- ❌ M7 copy breaks immersion immediately
- ❌ "AI" badge on every item — noise + unfinished
- ❌ Checkout button noop
- ❌ Vertical grid on phone — less appetite than horizontal row
- ❌ Recently viewed placeholder section
- ⚠️ Duplicate best-seller signaling (ribbon + badge)

**Redesign:** Remove all milestone copy. Horizontal `MenuRow` pattern on mobile (BDS extension). Hero item spotlight at top. Fly-to-cart animation. Hide AI badge until feature ships.

---

## 4. Search

**First impression:** "Feature-rich search bar" — cluttered.

**What users see:**
- Sticky header: back + glass search field
- Voice, camera, AI icon buttons (all disabled)
- Suggestion dropdown while typing
- Browse mode: Recent, Trending, Popular, Collections chips
- Results: restaurant/food rows with avatar, badges

**Critique:**
- ✓ Autofocus on entry
- ✓ Glass field elevation on focus
- ❌ Three dead icons — visual noise
- ❌ Restaurant results set query text instead of navigating
- ❌ Results rows less premium than home tiles
- ⚠️ No result stagger animation

**Redesign:** Single search field, no disabled icons. Results navigate immediately. Premium result rows matching home card quality. Voice as subtle optional affordance when ready.

---

## 5. Profile

**First impression:** "Internal admin panel."

**What users see:**
- Glass hero card: avatar, name, guest/sign-in hint
- Account card: "Firestore customer profile (M1)" + UID/Name/Email/Phone/Providers rows
- Settings card: 4 disabled ghost buttons
- Sign In / Continue Browsing / Sign Out

**Critique:**
- ❌ Firestore UID visible to end users
- ❌ Milestone copy in CardDescription
- ❌ No M65 styling — breaks premium narrative
- ❌ Disabled settings list feels broken
- ✓ Guest CTA copy is reasonable

**Redesign:** Complete consumer profile shell — avatar hero, order history teaser, saved addresses entry, preferences. Zero developer fields. Premium empty states for each section.

---

## 6. Cart

**First impression:** "Placeholder page."

**With items:** "Cart Preview" heading + "Mock cart shell only" + item count + Clear button.

**Empty:** BDS EmptyState — "Checkout logic arrives in M7."

**Critique:**
- ❌ Explicit mock/prototype language
- ❌ No line items, images, quantities — just count
- ❌ No premium layout

**Redesign:** Full cart UI shell with mock data — item rows with food photos, quantity steppers, price summary, disabled checkout with elegant "Coming soon" — not "M7".

---

## 7. Orders

**First impression:** "Acceptable empty state."

**Critique:**
- ✓ EmptyState component used correctly
- ⚠️ No premium illustration treatment
- ⚠️ No order card template preview

**Redesign:** Premium empty with food illustration, sample ghost order card layout for visual completeness.

---

## 8. Bottom Navigation

**First impression:** "Nice native tab bar."

**Critique:**
- ✓ Floating island, blur, spring indicator
- ✓ Safe-area padding
- ❌ Disappears on restaurant/menu routes
- ⚠️ Cart tab → mock preview mismatch with menu preview bar
- ⚠️ Indicator position CSS conflicts between shell and M65

**Redesign:** Contextual nav — mini-bar or slide-over on immersive routes; unified cart semantics.

---

## 9. Hero Banner (Home)

**Critique:**
- ⚠️ Food image at 25% opacity — weak appetite
- ❌ CTA does nothing
- ⚠️ Opacity fade transition only — not carousel-native

**Redesign:** Full-bleed food photography slides, parallax, tappable CTA, dot indicators with spring.

---

## 10. Restaurant Cards

**Discovery path (`DiscoveryRestaurantCard`):** Navigates ✓ — premium tile.

**Mock path (`MarketplaceRestaurantTile`):** No navigation ❌ — same visual, dead interaction.

**Redesign:** Single card component, always navigates. Larger cover ratio. Warm hover glow (MIB).

---

## 11. Food Cards

**Menu (`FoodCardItem`):** Best card in app — image-dominant, ribbons, stepper.

**Home trending (`MarketplaceFoodTile`):** BDS FoodCard wrapper — shared mock quantity bug across tiles.

**Redesign:** Unified food row/card system. Mobile horizontal row. Remove AI badge. Fly-to-cart.

---

## 12. Floating Cart

**Home:** BDS FloatingCart above nav — works visually when items present.

**Menu:** Preview bar with noop checkout.

**Critique:**
- ❌ Two cart systems, inconsistent
- ❌ Menu checkout dead

**Redesign:** Single floating cart component, shared store presentation, spring enter/exit.

---

## 13. Address Picker

**LocationChip + LocationSelectorSheet**

**Critique:**
- ✓ Bottom sheet pattern is native
- ✓ GPS + saved addresses + guest sign-in
- ⚠️ Placeholder address button unwired when location flag off
- ⚠️ Sheet styling not M65-enhanced

**Redesign:** Warm glass sheet, map preview thumbnail, recent address chips with food context ("Delivering to work").

---

## 14. Loading / Skeletons

**Critique:**
- ❌ Home skeleton rails permanent on mock path
- ❌ Generic shimmer bars — not food-shaped
- ✓ Menu/restaurant page skeletons resolve correctly
- ⚠️ Banner/category skeletons defined but unused

**Redesign:** Skeleton matches final card geometry. Max 2s shimmer → empty state. Never infinite skeleton.

---

## 15. Dark Mode

**Critique:**
- ⚠️ M65 dark overrides partial (food cards, search field)
- ❌ Profile, cart, location sheet — BDS default only
- ❌ Home warm gradient lost in dark — feels flat
- ✓ Reduced motion respected

**Redesign:** MIB warm dark (`#070504` stack) as default dark theme, not neutral gray dark.

---

## 16. Tablet (768–1024)

**Critique:**
- ⚠️ Single column home — wasted horizontal space
- ⚠️ Menu 2-col grid — okay but not editorial
- ❌ No side-by-side restaurant hero + menu preview
- ⚠️ Bottom nav centered island — good but content doesn't adapt

**Redesign:** 2-col home grid, sidebar category rail on menu, split restaurant hero.

---

## 17. Desktop (1280+)

**Critique:**
- ❌ `experience-shell.css` caps main at 48rem — phone column on desktop
- ⚠️ M65 sets max-width none but cascade conflicts
- ❌ No desktop-native layout — stretched mobile

**Redesign:** Editorial grid, max-content-width 90rem, side navigation option, multi-column discovery.

---

## 18. Landscape / Foldables

**Critique:**
- ❌ Not tested/designed — mobile layout rotated
- ❌ Hero heights may overflow
- ❌ Bottom nav may conflict with fold hinge

**Redesign:** Landscape-specific compact header, dual-pane on foldables (list + detail).

---

## Summary

| Screen | Verdict |
|--------|---------|
| Menu | Closest to target — still fails 9/10 bar |
| Restaurant | Strong hero, weak body |
| Home | **Reject** — broken + wrong hierarchy |
| Search | **Reject** — broken navigation |
| Profile | **Reject** — not a consumer screen |
| Cart/Orders | **Reject** — prototype language |
| Nav | Good foundation, context breaks |

**All screens fail Visual Gate. UX-2.0 required.**
