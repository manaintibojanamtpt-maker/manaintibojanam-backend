# Component Guide

## Import Pattern

```tsx
import { Button, Card, RestaurantCard, DesignSystemProvider } from '@bhojan/design-system';
import '@bhojan/design-system/styles.css';
```

## Buttons

| Variant | Use |
|---------|-----|
| `primary` | Main CTA (Order, Checkout) |
| `secondary` | Secondary actions |
| `outlined` | Tertiary / low emphasis |
| `ghost` | Inline toolbar actions |
| `danger` | Destructive |
| `fab` | Floating action |

Props: `loading`, `fullWidth`, `size="compact"`.

## Cards

- `Card` — generic surface
- `RestaurantCard` — marketplace listing
- `FoodCard` — menu item row
- `OfferCard` — promotions
- `MetricCard` — owner dashboard KPI

## Inputs

`Input`, `SearchBar`, `PhoneInput`, `AddressInput`, `OTPInput` — all token-styled, label + error support.

## Overlays

- `Dialog` / `Modal` — centered alerts
- `BottomSheet` — mobile filters, sort
- `Drawer` — side panels

## Order UI

`BillSummary`, `Timeline`, `CartBar`, `FloatingCart`, `QuantityStepper`, `Price`.

## States

`Skeleton`, `Loader`, `EmptyState`, `ErrorState`, `Toast`.

## Feature Flags

```tsx
<FeatureFlag enabled={flags.newRail} fallback={<LegacyRail />}>
  <CategoryRail />
</FeatureFlag>
```

## Composition Rules

- No Firebase, API, or routing inside BDS components
- Presentational props only
- All styling via `bds-*` classes or tokens

## Storybook

```bash
npm run dev
```

See `docs/STORYBOOK-GUIDE.md`.
