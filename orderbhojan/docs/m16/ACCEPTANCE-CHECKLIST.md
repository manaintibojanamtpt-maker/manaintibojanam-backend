# M1.6 Acceptance Checklist

## Visual
- [ ] Home feels edge-to-edge, not boxed dashboard
- [ ] Header glass appears on scroll
- [ ] Hero banner bleeds on mobile
- [ ] Bottom nav floats as glass island
- [ ] Restaurant cards lift on hover (desktop)

## Interaction
- [ ] Category chip morphs when selected
- [ ] Favorite heart burst animation
- [ ] ADD button shows floating cart
- [ ] Carousel auto-advances (unless reduced motion)

## Safe Area
- [ ] Content clears iPhone notch / Dynamic Island
- [ ] Bottom nav clears home indicator
- [ ] Landscape rotation OK

## Accessibility
- [ ] Reduced motion disables animations
- [ ] Screen reader announces home heading
- [ ] Keyboard reaches bottom nav

## Regression
- [ ] `npm run gate:m16` passes
- [ ] Auth at `/auth` unchanged
- [ ] Orders still requires sign-in

## Lighthouse (Manual)
- [ ] Performance ≥ 80 on production build
- [ ] Accessibility ≥ 90
