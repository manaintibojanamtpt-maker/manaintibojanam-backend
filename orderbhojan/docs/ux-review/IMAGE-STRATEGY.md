# Image Strategy

**Principle:** Every pixel should increase appetite. Images dominate; UI recedes.

**Current Appetite Score: 6.5 / 10**

---

## Current state

| Surface | Image treatment | Issue |
|---------|-----------------|-------|
| Home banner | Background at 25% opacity under gradient | Food is invisible |
| Restaurant cover | Full-bleed, blur-up | Strong ✓ |
| Food card (menu) | 16:11, blur-up, object-cover | Good but secondary to badges |
| Restaurant tile | ~40% of card height | Too small |
| Trending food | BDS FoodCard default | Generic sizing |
| Profile | Avatar only | No food context |
| Empty states | Icon only | Missed appetite opportunity |

---

## UX-2.0 image hierarchy

### Priority 1 — Hero dominance

| Screen | Image rule |
|--------|------------|
| Home | First viewport ≥60% food photography (full-bleed or mosaic) |
| Restaurant | Cover ≥45vh mobile, 55vh tablet, 70vh desktop |
| Menu | Optional hero dish spotlight — single large feature item |
| Search | No hero — results thumbnails min 64px, restaurants 80px |

### Priority 2 — Card ratios

| Component | Mobile | Tablet+ |
|-----------|--------|---------|
| FoodRow thumb | 96×96px square | 112×112px |
| FoodCard (grid) | 16:10 | 16:10 |
| RestaurantCard cover | 16:10 | 16:9 |
| Category circle | 72px diameter | 88px |

### Priority 3 — Technical pipeline

| Technique | Status | Action |
|-----------|--------|--------|
| Blur-up LQIP | Partial (custom hook) | BDS `AppetiteImage` component |
| Dominant color placeholder | Missing | Extract avg color from LQIP |
| Lazy loading | `loading="lazy"` | ✓ Keep |
| Prefetch next screen | Missing | Prefetch restaurant cover on tile hover/inView |
| WebP/AVIF | Depends on CDN | Document format strategy |
| srcset responsive | Missing | Add 1x/2x/3x for food thumbs |

---

## Photography art direction

### Do
- Warm lighting, steam, texture, close-up crops
- Single dish focus per card
- Consistent color grading (warm, saturated)
- Regional authenticity when possible

### Don't
- Stock photo generic plating
- Multiple dishes competing in one thumb
- Cold/blue color grading
- Text baked into food images

---

## Overlay & gloss (MIB patterns)

Migrate to BDS `AppetiteImage`:
- `mib-image-gloss` — subtle top highlight on photos
- Bottom gradient scrim for text on heroes
- Warm `sepia(5%)` in dark mode

---

## Empty & loading images

| State | Treatment |
|-------|------------|
| Skeleton | Food-shaped silhouette shimmer, not gray bars |
| Empty cart | Illustration of empty plate (warm, not line icon) |
| Empty search | Floating food icons mosaic, desaturated |
| Error | Friendly chef illustration |

---

## Performance budget

- LCP image (home hero): preload, `<link rel="preload">`
- Max food thumb payload: 40KB WebP
- Max hero payload: 120KB WebP
- Blur placeholder: <1KB base64

---

## Acceptance (9/10)

- [ ] Home first viewport is food-dominant
- [ ] All food cards ≥50% image area
- [ ] Blur-up + dominant color on all remote images
- [ ] Zero broken/placeholder gray boxes
- [ ] Photography appetizing in light and dark mode
