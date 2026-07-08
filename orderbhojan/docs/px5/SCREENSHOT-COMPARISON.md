# PX5 Screenshot Comparison

## Before (pre-PX5)

- 40vh skeleton hero with `placehold.co` cover URLs
- Identity below fold; Material-style `Card` offer tiles
- Separate quick-actions row with text buttons
- Bottom `MiniNavIsland` competing with `FloatingCTA`
- Grey placeholder gallery images

## After (PX5)

Screenshots: `docs/px5/restaurant-{dark|light}-{375|390|430|768|1024|1280|1440}.png`  
Landscape: `docs/px5/restaurant-{dark|light}-landscape-812.png`

### First viewport (375px dark)

- 46vh immersive cover with production Unsplash via manifest
- Logo, name, cuisine, rating, ETA, distance, delivery fee over photography
- Offer pill + Open/Verified badges on hero
- Glass back / share / favorite actions
- Primary **Open Menu** floating CTA

### Scroll

- Hero compresses; sticky restaurant name header appears
- Editorial About + lazy gallery + glass highlight chips

## Capture

```bash
VITE_FF_OB_RESTAURANT=true npm run dev -- --port 5178
node scripts/capture-restaurant-px5.mjs http://localhost:5178/
```
