# Spacing Strategy

**System:** 8pt base grid (CEO directive) — enforced through BDS, not local CSS.

**Current score: 6.5 / 10**

---

## Current problems

1. **Three spacing systems coexist:** BDS 4px grid, M65 8px unit, ad-hoc inline `style={{ marginTop: 'var(--bds-space-6)' }}`
2. **Section gaps uneven:** Home rails cramped; restaurant sections uniform but not luxurious
3. **Card internal padding inconsistent:** BDS Card default vs M65 overrides vs inline
4. **Safe-area padding added separately** from spacing grid — double-padding risk
5. **Desktop gutters undefined** — content floats without rhythm

---

## 8pt spacing scale (BDS canonical)

| Token | px | Use |
|-------|-----|-----|
| `--bds-space-0` | 0 | — |
| `--bds-space-1` | 4 | Tight inline (icon gap) — exception to 8pt |
| `--bds-space-2` | 8 | Chip padding, compact gaps |
| `--bds-space-3` | 16 | Card internal padding mobile |
| `--bds-space-4` | 24 | Element gaps within section |
| `--bds-space-5` | 32 | Subsection separation |
| `--bds-space-6` | 40 | — |
| `--bds-space-7` | 48 | **Section gap mobile** |
| `--bds-space-8` | 64 | **Section gap tablet** |
| `--bds-space-9` | 72 | Hero bottom breathing |
| `--bds-space-10` | 80 | **Section gap desktop** |

*Note: Align BDS to 8pt multiples — deprecate odd values like 20px, 28px in custom CSS.*

---

## Section spacing rules

| Context | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Between home sections | 48px | 64px | 80px |
| Hero to first content | 32px | 40px | 48px |
| Card grid gap | 16px | 20px | 24px |
| Rail item gap | 12px | 16px | 16px |
| Sticky header height | 56px + safe-top | 64px | 72px |
| Bottom nav clearance | 80px + safe-bottom | 88px | N/A (side nav) |

---

## Whitespace principles

1. **Luxury = more space between sections, not within cards**
2. **One primary content band per viewport scroll** on mobile
3. **Never stack 3+ horizontal rails without 48px+ separation**
4. **Edge-to-edge imagery, inset text** — photos bleed, copy breathes at 16–24px inset
5. **No cramped badge rows** — wrap or reduce badge count

---

## Migration

1. Audit all inline `style` spacing in OrderBhojan — replace with BDS tokens
2. Delete `--ob-m65-space-unit` — use BDS `--bds-space-*`
3. Add ESLint rule or gate check: no raw `px`/`rem` in component files
4. `gate:ux20` spacing smoke: verify section gaps ≥ `--bds-space-7` on home

---

## Acceptance (9/10)

- [ ] Single spacing system (BDS 8pt)
- [ ] Zero inline spacing styles in experience pages
- [ ] Home sections breathe at 48px+ gaps
- [ ] Touch targets ≥48px including padding
- [ ] Responsive spacing scales at 768/1280 breakpoints
