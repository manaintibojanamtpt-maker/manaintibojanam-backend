# M1.6 Migration Notes

## From M1.5 (0.3.5-m15) → M1.6 (0.3.6-m16)

### Added

- `src/styles/experience-premium.css` — premium visual layer
- `src/features/experience/hooks/useScrollChrome.ts` — visual scroll state
- `src/features/experience/hooks/useBlurUpImage.ts` — blur-up loading classes
- `npm run gate:m16`, `test:responsive`, `test:lighthouse`

### Changed (Visual Only)

- Home header, search, hero, cards, bottom nav styling
- `MarketplaceLayout` — unified floating nav (removed separate desktop nav bar)
- Wider fluid layout (max 90rem)

### Unchanged

- Routing, auth, Firebase, API, MSW, providers, stores (business logic)
- Mock data sources

### Verify

```bash
npm run gate:m16
npm run dev
```
