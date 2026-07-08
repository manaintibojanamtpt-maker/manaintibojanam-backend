# Desktop Improvements (1280–2560px)

**Current score: 5.5 / 10** — worst responsive tier.

---

## Current behavior

- `experience-shell.css` caps `.ob-marketplace-main` at `48rem` (~768px) at 1024px+
- M65 sets `max-width: none` on `.ob-m65-app` — **CSS cascade conflict**
- Content appears as **phone column centered on vast whitespace**
- Bottom nav island floats in center — disconnected from content width
- Restaurant/menu full-screen layouts don't use horizontal space

**Problem:** Desktop users see a mobile simulator, not a premium web experience.

---

## UX-2.0 desktop targets

### Layout model

| Width | Layout |
|-------|--------|
| 1280–1439 | Content max 960px centered + optional side margins |
| 1440–1919 | Content max 1200px, 3-col discovery grid |
| 1920+ | Content max 1400px (`--ob-content-max: 90rem`), editorial spacing |

### Home desktop

- **Hero band:** Full-width 70vh food photography with floating search overlay
- **Discovery grid:** 3–4 column restaurant cards, not horizontal rails
- **Sidebar option:** Fixed left nav (Home, Search, Orders, Profile) replacing bottom nav at 1280px+
- **Trending foods:** 4-column grid with large imagery

### Menu desktop

- **3-pane optional:** Category sidebar | Food list | Preview cart panel (right dock)
- Horizontal food rows at generous width
- Sticky restaurant header compresses to bar

### Restaurant desktop

- **Split hero:** Cover left 55%, info panel right 45% (Airbnb listing pattern)
- Gallery: 4-column masonry
- Sticky "Open Menu" becomes inline primary CTA in hero panel

### Search desktop

- Command palette pattern (Arc/Linear): centered modal search, keyboard `/` shortcut
- Results in 2-column with rich previews

### Navigation desktop

- Replace bottom nav with **left rail** or **top bar** at 1280px+
- Bottom nav hidden via `@media (min-width: 1280px)`

---

## CSS architecture fix

**Required:** Single layout authority — remove conflicting max-width rules:

1. Deprecate `experience-shell.css` 48rem cap
2. BDS layout tokens: `--bds-layout-max`, `--bds-layout-gutter`
3. One `MarketplaceLayout` responsive grid, not three CSS files fighting

---

## Mouse & keyboard desktop

- Hover states on all cards (scale 1.02 + warm glow)
- Keyboard shortcuts: `/` search, `Esc` close sheets
- Focus trap in modals
- Cursor pointer on all clickable cards

---

## Acceptance (9/10)

- [ ] 1920px screen uses >60% viewport width for content
- [ ] No phone-column on desktop
- [ ] Navigation appropriate for desktop (not bottom island)
- [ ] Hover + keyboard parity with touch
- [ ] Zero CSS cascade conflicts on layout max-width
