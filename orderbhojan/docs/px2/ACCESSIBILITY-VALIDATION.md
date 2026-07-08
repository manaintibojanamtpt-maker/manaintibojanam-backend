# PX2 Accessibility Validation

## Checks

- Screen reader headings on Home, Search (sr-only h1)
- ARIA on StickyCategoryRail tabs, NavIsland navigation
- Focus rings via BDS button/input tokens
- Reduced motion via `prefers-reduced-motion` in bds-px2.css
- Safe-area padding for notched devices in experience-px2-layout.css
- Color contrast via food theme semantic tokens

## Automated

- BDS a11y smoke (packages/design-system)
- ESLint react-hooks rules
- gate:px2 lint + build

## Manual follow-up

VoiceOver / TalkBack pass on Home → Restaurant → Menu flow before M7 approval.
