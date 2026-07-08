# PX5 Performance Report

| Metric | Result |
|---|---|
| Production build | PASSED |
| JS bundle total | 1506 KB (limit 1650 KB) |
| CSS bundle | 104.85 KB gzip 17.12 KB |
| Hero preload | `useHeroPreload` + WebP srcset via manifest |
| Cover formats | AVIF / WebP / responsive srcset |
| BlurHash | Blur placeholders on cover, logo, gallery |
| Gallery loading | IntersectionObserver lazy mount |
| Layout shift | Fixed hero aspect (46vh clamp); blur placeholders reserve space |
| LCP target | Hero `priority` + preload href at 1920w WebP |

## Image pipeline

All restaurant imagery resolves through:

- `src/features/restaurant/data/restaurant-photo-manifest.ts`
- `src/features/experience/data/food-photo-manifest.ts`

No `placehold.co` in restaurant path.

## Commands

```
npm run build
npm run test:performance
```
