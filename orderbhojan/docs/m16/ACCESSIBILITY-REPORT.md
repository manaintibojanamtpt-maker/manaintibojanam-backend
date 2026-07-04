# M1.6 Accessibility Report

## WCAG AA Foundations

- Screen reader headings preserved (`h1` sr-only on home)
- ARIA labels on icon buttons, carousel tabs, rails
- `aria-pressed` on favorites and category chips
- Focus styles inherited from BDS inputs/buttons
- `prefers-reduced-motion` disables animations/transitions

## Keyboard

- Restaurant tiles keyboard activatable when `onSelect` provided
- Bottom nav uses native BDS buttons
- Carousel dots are focusable tabs

## Reduced Motion

Premium CSS `@media (prefers-reduced-motion: reduce)` disables:

- Page enter, section reveal, hero fade
- Nav spring, favorite burst, hover transforms

## Large Text

Typography uses `clamp()` for greeting and section titles.

## Manual QA

See `ACCEPTANCE-CHECKLIST.md` for VoiceOver / TalkBack verification steps.
