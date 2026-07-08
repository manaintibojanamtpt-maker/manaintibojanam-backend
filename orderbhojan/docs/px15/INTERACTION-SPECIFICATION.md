# Interaction Specification — PX1.5

**No implementation.** Behavior contract for engineering.

---

## Global interactions

| Action | Behavior | Haptic | Motion |
|--------|----------|--------|--------|
| Tap card (restaurant/food) | Navigate to destination | light | shared hero if applicable |
| Tap ADD | Add item + fly-to-cart | medium | fly-to-cart + stepper replace |
| Tap NavIsland item | Navigate tab | selection | indicator layoutId slide |
| Pull down (home) | Refresh feed | light | elastic overscroll |
| Scroll down >80px | Hide NavIsland | — | translateY 100% 300ms spring |
| Scroll up | Show NavIsland | — | reverse |
| Long press food row | Quick preview sheet (optional v1) | light | sheet 45% snap |

---

## HOME

| Element | Gesture | Result |
|---------|---------|--------|
| LocationChip | tap | Address BottomSheet |
| PremiumSearch | tap | Focus OR navigate /search with focus |
| Hero carousel | swipe horizontal | Next slide, spring |
| Hero dot | tap | Jump to slide |
| PremiumChip category | tap | Filter rail visual state + scroll to section |
| RestaurantCard | tap | /restaurant/:slug shared hero |
| FoodRow ADD | tap | fly-to-cart, preview store update |
| Trust strip | — | display only |

---

## DISCOVERY

| Element | Gesture | Result |
|---------|---------|--------|
| SegmentedControl filter | tap | Filter feed (existing logic) |
| Collection card | tap | Collection detail / filtered home |
| Grid/rail toggle | tap | Layout switch persist session |

---

## SEARCH

| State | Interaction |
|-------|-------------|
| Zero | Tap recent → fill query · Tap trending → fill · Tap collection → navigate |
| Typing | Debounce 200ms suggestions · Tap suggestion → navigate or fill |
| Results | Tap restaurant row → /restaurant/:slug · Tap food → /menu#item |
| No results | Tap trending chip → new search |
| Filters | Chip toggle filters bar (existing) |
| Back | Clear or exit to previous |

**Keyboard:** ↑↓ suggestions · Enter select · Esc clear/back

---

## RESTAURANT

| Element | Gesture | Result |
|---------|---------|--------|
| Back | tap | pop navigation |
| Cover parallax | scroll | translateY 0.3× scroll |
| Favorite | tap | toggle + burst + haptic |
| Share | tap | native share sheet if available |
| OfferBanner card | tap | apply offer visual (future) |
| Highlight chip | tap | scroll to gallery/about |
| Menu preview row | tap | /menu scroll to item |
| View full menu | tap | /menu |
| FloatingCTA | tap | /menu |
| About accordion | tap | expand/collapse 300ms |

---

## MENU

| Element | Gesture | Result |
|---------|---------|--------|
| Category chip | tap | scroll to section + spy update |
| Section scroll | scroll | update active chip haptic edge |
| FoodRow body | tap | open Customize if variants else ADD |
| ADD | tap | ADD or open Customize |
| Stepper +/- | tap | update qty haptic each |
| CartBar | tap | /cart |
| Search icon | tap | in-menu filter focus |

---

## CUSTOMIZATION SHEET

| Element | Gesture | Result |
|---------|---------|--------|
| Drag handle | drag | snap 45/90/dismiss |
| Variant segment | tap | select required variant |
| Add-on chip | tap | toggle multi |
| Stepper | tap | qty |
| Add to cart | tap | close sheet + fly-to-cart + haptic |
| Scrim tap | tap | dismiss if no required pending |

---

## CART

| Element | Gesture | Result |
|---------|---------|--------|
| Stepper | tap | update line |
| Swipe row left | swipe | remove confirm dialog |
| Proceed | tap | locked animation + toast "Checkout opening soon" |
| Continue browsing | tap | / |

---

## PROFILE

| Element | Gesture | Result |
|---------|---------|--------|
| Sign in | tap | /auth |
| Quick tile | tap | navigate section (orders placeholder ok) |
| Setting row | tap | navigate or sheet |
| Sign out | tap | confirm Dialog |

---

## NAVIGATION

| Context | Component | Items |
|---------|-----------|-------|
| Marketplace | NavIsland | Home, Search, Cart, Orders, Profile |
| Immersive | MiniNavIsland | Back, Home, Cart |

---

## Error recovery

| Error | User action | System response |
|-------|-------------|-----------------|
| Network fail | Retry tap | reload section |
| Location denied | Manual address | open Address sheet |
| Menu load fail | Retry | skeleton → content |
| Image fail | — | dominant color placeholder |

---

## Forbidden interactions

- Disabled-looking tappable dead buttons
- Search results that only change query string
- Cards with no navigation target
- Infinite skeleton without timeout → empty

---

## Accessibility interactions

- All actions keyboard reachable
- Focus trap in sheets/dialogs
- aria-live on cart count changes
- 48px min touch targets

See [ACCESSIBILITY-SPECIFICATION.md](./ACCESSIBILITY-SPECIFICATION.md)
