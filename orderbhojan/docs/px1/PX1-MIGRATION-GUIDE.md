# PX1 Migration Guide

**From:** `0.8.5-m65`  
**To:** `0.9.0-px1`  
**Audience:** OrderBhojan developers

---

## Overview

PX1 is a **full presentation rebuild**. No API or routing migration. If you touched experience UI, read this.

---

## Design system

### Before
```typescript
import { Button, Card } from '@bhojan/design-system';
// + local premiumMotion
// + experience-premium-m65.css classes
```

### After
```typescript
import {
  FoodRow,
  NavIsland,
  ImmersiveHero,
  MotionReveal,
} from '@bhojan/design-system';
// BDS v1.1-px1 only — no local UI
```

### package.json
```json
"@bhojan/design-system": "file:../packages/design-system"
```
Run `npm run build --prefix ../packages/design-system` after BDS update.

---

## Theme

### Before
```tsx
<DesignSystemProvider theme="system">
```

### After
```tsx
<DesignSystemProvider theme="food">
```

Themes: `food` (warm dark default), `foodLight`, `system` (maps to food/foodLight).

---

## Removed files (OrderBhojan)

| File | Replacement |
|------|-------------|
| `src/features/experience/motion/premiumMotion.tsx` | BDS `motion/*` |
| `src/styles/experience-premium-m65.css` | BDS tokens + components |
| `experience-shell.css` layout rules | BDS layout utilities + `experience-px1.css` (minimal) |

---

## Component mapping

| Old | New (BDS) |
|-----|-----------|
| `MarketplaceRestaurantTile` | `RestaurantCard size="immersive"` |
| `MarketplaceFoodTile` | `FoodRow` |
| `FoodCardItem` | `FoodRow` + `FoodCard layout="spotlight"` |
| `ExperienceBottomNav` | `NavIsland` |
| `HeroHeader` + `HeroBannerCarousel` | `ImmersiveHero` + `HeroCarousel` |
| Inline restaurant hero | `RestaurantHero` |
| `HomeSearchBar` | `PremiumSearch variant="floating"` |

---

## CSS classes

**Do not use:** `ob-m65-*`, `ob-m65-home`, etc.

**Use:** BDS component props + semantic tokens only.

Gate:px1 fails if `ob-m65` appears in `src/`.

---

## Copy rules

**Remove all:**
- "M7", "M1", "M6" milestone references in UI
- "Mock", "preview shell", "Firestore" in user-visible text
- UID, provider lists on profile

Gate:px1 includes copy smoke test on dist output.

---

## Feature flags

No flag changes. PX1 rebuilds presentation for both mock and discovery paths equally.

---

## Testing

```bash
npm run gate:px1      # full gate
npm run test:unit     # includes px1 tests
npm run certify:bds   # 100% BDS adoption required
```

---

## Rollback

```bash
git checkout orderbhojan-v0.8.5-m65
npm install
npm run build
```

Presentation-only rollback — no data migration.

---

## FAQ

**Q: Can I add a local UI component for a quick fix?**  
A: No. Extend BDS. ARB will reject.

**Q: Can I patch CSS on Home?**  
A: No. Rebuild screen using BDS components per PX1-HIGH-FIDELITY-DESIGNS.md.

**Q: When does M7 start?**  
A: After PX1 Visual Certification + unanimous CEO/PM/ARB/DRB approval.
