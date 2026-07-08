# PX5 Accessibility Report

| Check | Status |
|---|---|
| BDS CSS a11y smoke | PASSED |
| WCAG AA focus rings | Glass action buttons use `:focus-visible` outline |
| Touch targets | 48px min on hero actions (`--bds-space-touch-min`) |
| Screen reader | Hero `aria-label`; action `aria-label` / `aria-pressed` on favorite |
| Reduced motion | Hero collapse, favorite burst, menu CTA transitions disabled under `prefers-reduced-motion` |
| Safe areas | `env(safe-area-inset-*)` on sticky header, floating CTA, hero chrome |
| Semantic structure | `<header>` hero, section headings `h2`, gallery `figure`/`figcaption` |
| Error state | `PremiumEmpty` with labeled retry action |

## Keyboard

- Back, share, favorite: native `<button>` elements
- Open Menu: BDS `FloatingCTA` / `Button`

## Command

```
npm run test:a11y --prefix ../packages/design-system
```
