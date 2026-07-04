# M1.5 Acceptance Checklist

## Home
- [ ] Greeting changes by time of day
- [ ] Address placeholder visible
- [ ] Search bar does not execute search
- [ ] Banner auto-advances (unless reduced motion)
- [ ] Category chips scroll horizontally
- [ ] Featured restaurants show mock cards
- [ ] Skeleton sections visible for deferred lists
- [ ] ADD on trending food shows floating cart

## Navigation
- [ ] Bottom nav has exactly 5 items
- [ ] Active tab highlighted with indicator
- [ ] Cart and Search routes render UI shells

## Profile
- [ ] Guest sees sign-in CTA
- [ ] Authenticated user sees Firestore profile
- [ ] Sign out works (authenticated)

## Orders
- [ ] Unauthenticated user redirected to `/auth`
- [ ] Authenticated user sees empty orders state

## Cart
- [ ] Empty cart illustration and CTA
- [ ] Mock items show preview state

## Accessibility
- [ ] Keyboard navigates bottom nav
- [ ] ARIA labels on icon buttons
- [ ] Reduced motion disables animations

## Regression
- [ ] `npm run gate:m15` passes
- [ ] M1 auth flows still work at `/auth`
