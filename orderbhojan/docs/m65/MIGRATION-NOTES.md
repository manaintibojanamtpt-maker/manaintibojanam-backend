# M6.5 Migration Notes

Visual-only milestone — **no migration required**.

## New assets
- `src/styles/experience-premium-m65.css`
- `src/features/experience/motion/premiumMotion.tsx`

## Dependency
- `framer-motion` (motion layer only)

## Enable
No flags. Visual layer applies automatically when CSS loads.

## Rollback
Remove `experience-premium-m65.css` import from `main.tsx` to revert to M6 visuals.
