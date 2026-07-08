# Typography Strategy

**Current score: 6.8 / 10**

---

## Current fonts (BDS)

| Role | Family | Weights |
|------|--------|---------|
| UI / body | Plus Jakarta Sans | 400–800 |
| Display | Outfit | 800–900 |

**MIB addition not in BDS:** Great Vibes (script accent)

---

## Problems

1. **Home greeting uses display scale but lacks emotional warmth** — functional "Good morning" vs MIB storytelling
2. **Micro-labels too subtle** — BDS `label` (11px) vs MIB `9px font-black uppercase tracking-[0.3em]`
3. **Price hierarchy weak** — price same visual weight as description on some cards
4. **Too many type sizes on restaurant page** — caption, bodySm, body, subtitle, title, heading without clear ladder
5. **Milestone copy uses bodySm** — draws eye to wrong content
6. **No script accent** for hero emotional moments

---

## Type scale (UX-2.0)

| Variant | Size | Weight | Tracking | Use |
|---------|------|--------|----------|-----|
| **displayHero** | clamp(2.75rem, 8vw, 5rem) | 900 | -0.04em | Home food hero headline |
| **displayXl** | 3rem | 900 | -0.03em | Restaurant name |
| **display** | 2.25rem | 800 | -0.03em | Section heroes |
| **heading** | 1.875rem | 800 | -0.02em | Page titles |
| **title** | 1.5rem | 700 | -0.02em | Card titles, food names |
| **titleSm** | 1.25rem | 700 | -0.01em | Compact food names (row layout) |
| **body** | 0.9375rem | 400 | 0 | Descriptions |
| **bodySm** | 0.8125rem | 400 | 0 | Secondary info |
| **priceLg** | 1.25rem | 800 | -0.02em | Primary price |
| **price** | 1.125rem | 700 | -0.02em | Inline price |
| **caption** | 0.75rem | 500 | 0.01em | Hints, metadata |
| **microLabel** | 0.625rem | 900 | 0.25em | Section eyebrows (uppercase) |
| **scriptAccent** | 2.5rem | 400 | 0 | Great Vibes emotional word |

---

## Hierarchy rules

### Home
```
microLabel: "CURATED FOR YOU"
displayHero: "Hyderabadi Biryani" (food name, not greeting)
body: Supporting line — one sentence max
```

### Menu food row
```
titleSm: Dish name (1 line clamp)
caption: Description (2 line clamp)
priceLg: ₹299
microLabel: BESTSELLER ribbon
```

### Restaurant
```
displayXl: Restaurant name
body: Cuisine · Location
caption: ETA · Distance · Rating (single line, muted)
```

---

## Weight distribution

| Element | Weight |
|---------|--------|
| Food names | 700–800 |
| Prices | 800 |
| Descriptions | 400 |
| Metadata (ETA, etc.) | 500 |
| Section eyebrows | 900 uppercase |
| CTAs | 700 |

**Never use 400 weight for food names or prices.**

---

## Line height

| Variant | Line height |
|---------|-------------|
| Display sizes | 0.95–1.05 (tight, editorial) |
| Titles | 1.15 |
| Body | 1.5 |
| Captions | 1.4 |

---

## Responsive type

- Display sizes use `clamp()` — no breakpoint jumps
- Minimum 16px body on mobile (never 14px for primary content)
- Desktop: displayHero caps at 5rem, not unlimited

---

## Accessibility

- WCAG AA contrast on all text/background pairs
- Minimum 12px for any visible text (microLabel exception at 10px only for uppercase eyebrows with high contrast)
- User font scaling supported — use rem exclusively

---

## Migration

1. Add variants to BDS `Text` component
2. Remove inline `letterSpacing` styles from OrderBhojan pages
3. Add Great Vibes to BDS font loading (subset, lazy)
4. Gate: no raw `font-size` in experience components

---

## Acceptance (9/10)

- [ ] Clear 3-level hierarchy on every screen (primary, secondary, tertiary)
- [ ] Food names visually dominant over metadata
- [ ] Prices punch above descriptions
- [ ] Script accent on home hero (optional word)
- [ ] Zero milestone copy in any text variant
