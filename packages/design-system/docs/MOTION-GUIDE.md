# Motion Guide

## Philosophy

Food apps must feel **fast** and **native**. BDS motion is subtle, purposeful, and respects `prefers-reduced-motion`.

## Providers

`MotionProvider` + `useReducedMotion()` disable animations when the user prefers reduced motion.

## Presets (`src/animations/`)

| Preset | Use |
|--------|-----|
| `pageEnter` | Route transitions |
| `dialogEnter` | Modal open |
| `sheetEnter` | Bottom sheet slide |
| `cartPulse` | Add-to-cart feedback |
| `favoritePop` | Wishlist toggle |
| `skeleton` | Loading shimmer |

## CSS

- Durations: `--bds-duration-fast` (120ms), `--bds-duration-normal` (200ms)
- Easing: `--bds-ease-standard`
- Skeleton respects `@media (prefers-reduced-motion: reduce)`

## Micro-interactions

- Buttons: brightness + transform on press
- Interactive cards: `translateY(-2px)` hover
- Cart bar: fixed bottom with safe-area inset

## Page Transitions

Products should wrap route outlets with motion presets; BDS-1 provides tokens only — integration in BDS-2+.

## Checkout & Tracking

Timeline active dot uses primary glow. Order status steps use `Timeline` component with `active` flag.

## Do Not

- Auto-play infinite animations on critical paths
- Block interaction during transitions > 300ms
- Ignore reduced-motion preference
