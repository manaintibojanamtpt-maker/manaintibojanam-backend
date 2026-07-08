# PX6 Motion Verification

| Motion | Implementation | Reduced motion |
|---|---|---|
| Restaurant → menu enter | `.ob-food-px6--enter` on `MotionPage` when `fromRestaurant` state | Disabled |
| Category rail scroll spy | `useCategoryScrollSpy` IntersectionObserver | N/A (no animation) |
| Food image blur-up | BDS `AppetiteImage` blur placeholder → loaded | Instant swap (BDS) |
| Floating Add animation | `.ob-food-px6__add--fly` on `FoodRowAddButton` | Disabled |
| Fly-to-order (poster) | `.ob-food-px6__poster-wrap--fly` on signature add | Disabled |
| Bottom sheet spring | BDS `BottomSheet` spring (Framer) | BDS reduced-motion path |
| Quantity animation | BDS `QuantityStepper` value update | Static |
| Order preview pulse | `.ob-food-px6__preview-bar--enter` remount on count | Disabled |
| Live price update | `.ob-food-px6__sheet-price` transition | Disabled |

## Verification method

1. Manual: add item → observe add pulse + preview bar enter animation
2. Manual: open customize sheet → variant/quantity changes update live total
3. Navigate from restaurant Open Menu → menu page enter fade
4. OS: enable `prefers-reduced-motion: reduce` → confirm CSS `@media` blocks disable PX6 keyframes

## Not implemented (CEO lock)

- Full Order Composer fly-to animation
- Review Order CTA navigation
