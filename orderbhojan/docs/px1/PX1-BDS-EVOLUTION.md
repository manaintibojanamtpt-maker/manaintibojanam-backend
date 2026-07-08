# PX1 BDS Evolution

**Program:** PX1  
**Stage:** 3 — Bhojan Design System Evolution  
**Target:** BDS v1.1-px1  
**Status:** Specification complete — **ARB + DRB approval required**

---

## Principle

**No local UI components in OrderBhojan.** Every new element becomes a reusable BDS export. OrderBhojan consumes `@bhojan/design-system` only.

---

## Version strategy

| Version | Scope |
|---------|-------|
| BDS v1.0 | Frozen baseline (current) |
| BDS v1.1-px1 | PX1 additive extensions — non-breaking |
| OrderBhojan | Removes `premiumMotion.tsx`, `experience-premium-m65.css` after migration |

---

## New tokens

### Color (`tokens/colors.ts` + `bds.css`)

```typescript
// Warm luxury (MIB-derived)
backgroundLuxury: '#070504'
surfaceWarm: '#120D0A'
surfaceWarmStrong: '#1A1410'
glassWarm: 'color-mix(in srgb, #120D0A 72%, transparent)'
glassWarmBorder: 'rgba(255, 170, 95, 0.12)'
glowPrimary: '0 0 30px -10px rgba(255, 107, 53, 0.25)'
gradientHeroScrim: 'linear-gradient(to top, rgba(7,5,4,0.92) 0%, transparent 55%)'

// Badge semantics
badgeBestseller: '#D4A574'
badgeChef: '#F4C27A'

// Theme mode
food: { /* warm dark as default dark */ }
foodLight: { /* cream kitchen morning */ }
```

### Typography (`tokens/typography.ts`)

```typescript
displayHero: { size: 'clamp(2.75rem, 8vw, 5rem)', weight: 900, lineHeight: 0.95 }
microLabel: { size: '0.625rem', weight: 900, letterSpacing: '0.25em', transform: 'uppercase' }
priceLg: { size: '1.25rem', weight: 800, letterSpacing: '-0.02em' }
titleSm: { size: '1.25rem', weight: 700 }
scriptAccent: { family: 'Great Vibes', size: '2.5rem' }
```

### Spacing (`tokens/spacing.ts`)

```typescript
sectionGapMobile: '48px'   // --bds-space-7
sectionGapTablet: '64px'   // --bds-space-8
sectionGapDesktop: '80px'  // --bds-space-10
cardInset: '20px'
touchMin: '48px'
layoutSidebarWidth: '240px'
layoutMaxWide: '1400px'
```

### Shadow (`tokens/shadows.ts`)

```typescript
foodCard: '0 10px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.02)'
navIsland: '0 8px 32px rgba(0,0,0,0.35)'
glowPrimary: '0 0 30px -10px rgba(255,107,53,0.25)'
liftSoft: '0 4px 24px rgba(0,0,0,0.2)'
```

### Motion (`tokens/motion.ts`) — NEW FILE

```typescript
springDefault: { stiffness: 260, damping: 28 }
springSnappy: { stiffness: 400, damping: 32 }
springGentle: { stiffness: 180, damping: 24 }
durationReveal: 0.5
durationPress: 0.12
durationFlyToCart: 0.4
easeSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
```

### Radius (`tokens/radius.ts`)

```typescript
foodCard: '1.75rem'
hero: 'clamp(1.25rem, 3vw, 2rem)'
navIsland: '2.5rem'
```

### Safe area (`utilities/safeArea.css`) — NEW

```css
.bds-safe-top { padding-top: env(safe-area-inset-top); }
.bds-safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
.bds-safe-x { padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right); }
.bds-fixed-bottom-safe { bottom: calc(env(safe-area-inset-bottom) + var(--bds-space-4)); }
```

---

## New components

### Layout & hero

| Component | Export | Description |
|-----------|--------|-------------|
| **ImmersiveHero** | `@bhojan/design-system` | Full-bleed image, scrim, content slot, parallax prop |
| **RestaurantHero** | same | Cover + logo overlap + identity slot |
| **ParallaxHero** | same | Scroll-linked transform wrapper |
| **ContextHeader** | same | Collapsing sticky header with scroll hook |
| **GlassSurface** | same | Warm glass container, blur, border token |

### Navigation

| Component | Description |
|-----------|-------------|
| **NavIsland** | Floating bottom nav shell + indicator |
| **MiniNavIsland** | Compact back/home/cart for immersive routes |
| **SideNav** | Desktop left rail replacement |
| **StickyCategoryRail** | Horizontal + vertical variants, scroll-spy |

### Food & restaurant

| Component | Description |
|-----------|-------------|
| **FoodRow** | Horizontal mobile row — text + thumb + ADD |
| **FoodRowSkeleton** | Matching skeleton |
| **HeroCarousel** | Spring slide, parallax, dots |
| **OfferBanner** | Horizontal offer cards for restaurant hero |
| **FoodGallery** | Masonry/grid food photos |
| **RestaurantHeader** | Identity block below hero |

### Search & input

| Component | Description |
|-----------|-------------|
| **PremiumSearch** | Floating/sticky variants, no icon clutter |
| **PremiumChip** | Category circle with photo fill |

### Cart & CTA

| Component | Description |
|-----------|-------------|
| **CartBar** | Sticky bottom bar — extends FloatingCart |
| **FloatingCTA** | Sticky primary action pill/bar |
| **FlyToCart** | Motion utility + hook |

### Media

| Component | Description |
|-----------|-------------|
| **AppetiteImage** | Blur-up, dominant color, aspect enforce, gloss overlay |
| **ImageLoader** | LQIP pipeline wrapper |

### Motion (`motion/`)

| Export | Description |
|--------|-------------|
| **MotionReveal** | Section stagger (from OB premiumMotion) |
| **MotionPage** | Page enter |
| **MotionPress** | Scale + haptic |
| **SharedHero** | layoutId transition wrapper |
| **useHaptic** | Vibration patterns |
| **useReducedMotion** | already exists — re-export |

### Empty & loading

| Component | Description |
|-----------|-------------|
| **PremiumEmpty** | Illustration slot + emotional copy |
| **Skeleton** extensions | `shape="hero-food" \| "food-row" \| "restaurant-tile"` |

---

## Extended existing components

| Component | PX1 extension |
|-----------|---------------|
| **FoodCard** | `layout="row" \| "card" \| "spotlight"` |
| **RestaurantCard** | `size="immersive" \| "compact" \| "grid"` |
| **FloatingCart** | Spring enter/exit built-in |
| **BottomSheet** | `variant="warm-glass"`, snap points |
| **Button** | `variant="appetite"` — floating ADD pill |
| **Chip** | `variant="premium"` — photo fill circle |
| **Badge** | `bestseller`, `chef`, `offer` semantic variants |
| **SearchBar** | `variant="premium"` |
| **QuantityStepper** | `haptic` prop |
| **Text** | New variants: displayHero, microLabel, priceLg, titleSm, scriptAccent |
| **ThemeProvider** | `food` + `foodLight` theme modes |
| **EmptyState** | `variant="premium"` with illustration slot |

---

## Deprecated in OrderBhojan (post-PX1)

| Remove | Replace with |
|--------|--------------|
| `src/features/experience/motion/premiumMotion.tsx` | BDS `motion/*` |
| `src/styles/experience-premium-m65.css` | BDS tokens + component variants |
| `MarketplaceRestaurantTile` | BDS `RestaurantCard` |
| `MarketplaceFoodTile` | BDS `FoodRow` / `FoodCard` |
| Inline hero markup | `RestaurantHero`, `ImmersiveHero` |
| `ExperienceBottomNav` wrapper CSS | BDS `NavIsland` |

**Keep:** Feature logic files, hooks, stores, API clients — presentation only changes.

---

## BDS file structure (v1.1)

```
packages/design-system/src/
  tokens/
    motion.ts          NEW
    shadows.ts         EXTEND
    colors.ts          EXTEND
    typography.ts      EXTEND
    spacing.ts         EXTEND
  motion/              NEW
    MotionReveal.tsx
    MotionPage.tsx
    MotionPress.tsx
    SharedHero.tsx
    FlyToCart.tsx
    useHaptic.ts
  components/
    ImmersiveHero/
    RestaurantHero/
    FoodRow/
    NavIsland/
    PremiumSearch/
    CartBar/
    AppetiteImage/
    ...
  utilities/
    safeArea.css       NEW
  styles/
    bds.css            EXTEND with PX1 tokens
```

---

## ARB compliance

| Rule | Status |
|------|--------|
| Non-breaking v1.0 API | ✓ additive only |
| No business logic in BDS | ✓ presentation only |
| Semantic tokens only | ✓ |
| Single source of truth | ✓ |
| OrderBhojan no local UI | ✓ enforced at gate |

---

## DRB sign-off required

- [ ] Component APIs reviewed
- [ ] Token naming approved
- [ ] FoodRow mobile layout approved
- [ ] Warm dark `food` theme approved
- [ ] Storybook stories planned for all new components

**Next stage:** [PX1-IMPLEMENTATION-PLAN.md](./PX1-IMPLEMENTATION-PLAN.md) (blocked until DRB + ARB approve Stage 2–3)
