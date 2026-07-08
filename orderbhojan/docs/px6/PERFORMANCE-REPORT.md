# PX6 Performance Report

| Metric | Result |
|---|---|
| Production build | PASSED |
| JS bundle total | 1513 KB (limit 1650 KB) |
| CSS bundle | 110.52 KB gzip 17.94 KB |
| Hero preload | First signature dish via `useHeroPreload` + manifest WebP |
| Food image formats | AVIF / WebP / responsive srcset via `food-item-photo-manifest` |
| BlurHash | All dish photos use manifest blur placeholders |
| Lazy loading | BDS `AppetiteImage` lazy except first signature poster |
| Layout shift | Fixed thumb dimensions (8.5rem editorial); blur reserves space |
| LCP target | Signature rail first item `priority` + preload at 960w WebP |

## Image pipeline

All food imagery resolves through:

- `src/features/food/data/food-item-photo-manifest.ts`
- `src/features/experience/data/food-photo-manifest.ts`

No external image URLs inside UI components. No `placehold.co` in mock menu data.

## Commands

```
npm run build
npm run test:performance
```
