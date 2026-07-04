# OrderBhojan 0.3.5-m15 Release Notes

## Marketplace Experience Shell (M1.5)

### Highlights

- **New home experience** — Hero greeting, delivery address placeholder, promotional banner carousel, category rail, featured restaurants, and trending foods
- **Consumer navigation** — Five-tab bottom nav (Home, Search, Cart, Orders, Profile) with animated active indicator
- **Premium cards** — BDS restaurant and food tiles with ratings, badges, favorites, and mock add-to-cart
- **Floating cart preview** — Appears when mock items are added; no checkout logic
- **Search, Cart, Orders shells** — Beautiful placeholder UX with empty states and skeletons
- **Profile refresh** — Guest-friendly profile with settings placeholders

### Technical

- New module: `src/features/experience/`
- New styles: `src/styles/experience-shell.css`
- Zustand stores for cart preview, favorites, category selection
- TanStack Query mock providers (no API calls)

### Not Included

Discovery, Location, Restaurant APIs, Search logic, Cart checkout, Payments, Orders backend

### Upgrade

```bash
npm install
npm run gate:m15
```

### Git Commit Message

```
feat(orderbhojan): M1.5 marketplace experience shell with BDS-only UI

Replace M0 developer dashboard with consumer food marketplace shell:
hero header, category rail, mock restaurant/food cards, five-tab nav,
search/cart/orders placeholders, floating cart preview, and profile shell.
Mock data only — no discovery, location, or checkout APIs.
```
