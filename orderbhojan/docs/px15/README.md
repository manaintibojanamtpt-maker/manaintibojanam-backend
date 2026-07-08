# PX1.5 — Design Freeze & Visual Prototype Approval

**Program:** PX1.5  
**Version:** `0.8.9-px15`  
**Status:** Design package complete — **awaiting CEO + PM + ARB + DRB approval**

---

## Mission

Create the **definitive visual identity** of OrderBhojan. Zero design ambiguity for engineering. **No React. No CSS. No implementation.**

---

## Absolute rule

| Allowed | Forbidden |
|---------|-----------|
| Product design documentation | React / Vue / any app code |
| SVG visual prototypes | CSS / Tailwind in app |
| BDS component specifications | Framer Motion implementation |
| Motion / interaction specs | OrderBhojan source changes |
| Design token proposals | BhojanOS changes |

**Implementation agents remain inactive until DESIGN-FREEZE is approved.**

---

## Deliverables

| Document | Purpose |
|----------|---------|
| [DESIGN-FREEZE.md](./DESIGN-FREEZE.md) | **Frozen design contract** — canonical |
| [VISUAL-SPECIFICATION.md](./VISUAL-SPECIFICATION.md) | Global visual language |
| [SCREEN-BLUEPRINTS.md](./SCREEN-BLUEPRINTS.md) | Pixel specs per screen × breakpoint × theme |
| [INTERACTION-SPECIFICATION.md](./INTERACTION-SPECIFICATION.md) | All user interactions |
| [MOTION-SPECIFICATION.md](./MOTION-SPECIFICATION.md) | Animation specs (no code) |
| [RESPONSIVE-SPECIFICATION.md](./RESPONSIVE-SPECIFICATION.md) | 320–2560, portrait/landscape/foldables |
| [ACCESSIBILITY-SPECIFICATION.md](./ACCESSIBILITY-SPECIFICATION.md) | WCAG AA + touch + motion |
| [DARK-MODE-SPECIFICATION.md](./DARK-MODE-SPECIFICATION.md) | food / foodLight themes |
| [DESIGN-TOKENS.md](./DESIGN-TOKENS.md) | Complete token registry |
| [BDS-CHANGES.md](./BDS-CHANGES.md) | BDS v1.1-px15 proposals |
| [COMPONENT-MAPPING.md](./COMPONENT-MAPPING.md) | Screen → BDS component map |
| [IMPLEMENTATION-HANDOFF.md](./IMPLEMENTATION-HANDOFF.md) | Engineer read-first guide |
| [CHECKLIST.md](./CHECKLIST.md) | DRB approval checklist |

---

## Visual prototypes

Static SVG mockups in [`prototypes/`](./prototypes/):

| Asset | Viewport |
|-------|----------|
| `home-mobile-light.svg` | 375×812 light |
| `home-mobile-dark.svg` | 375×812 dark (food) |
| `restaurant-mobile.svg` | 375×812 |
| `restaurant-desktop.svg` | 1440×900 |
| `menu-mobile.svg` | 375×812 |
| `search-mobile.svg` | 375×812 |
| `discovery-mobile.svg` | 375×812 |
| `profile-mobile.svg` | 375×812 |
| `floating-cart.svg` | 375×812 overlay |
| `customization-sheet.svg` | 375×812 sheet |
| `empty-state.svg` | 375×812 |
| `error-state.svg` | 375×812 |
| `loading-state.svg` | 375×812 |
| `skeleton-state.svg` | 375×812 |

---

## Prior art

- [PX1 Experience Blueprint](../px1/PX1-EXPERIENCE-BLUEPRINT.md)
- [Product Experience Review](../ux-review/README.md)
- BDS v1.0 tokens (`packages/design-system`)

---

## DRB approval criteria (all must be YES)

- [ ] Premium consumer app feel
- [ ] MIB warmth preserved
- [ ] Every screen cohesive
- [ ] Implementable entirely via BDS
- [ ] Interactions fully specified
- [ ] Responsive behaviors documented
- [ ] Accessibility documented

---

## Stop condition

**Do NOT implement.** Wait for explicit **CEO + PM + ARB + DRB** approval of [DESIGN-FREEZE.md](./DESIGN-FREEZE.md).

Only then may PX1 Stage 4 (engineering) begin.
