# PX6 Screenshot Comparison

## Before (pre-PX6)

- `MiniNavIsland` competing with content
- Large intro title block pushing food below fold
- `FoodRow` plain `<img>` without BlurHash/srcset
- `placehold.co` dish images in fixtures
- Material-style `.ob-food-card` grid (boxed layouts)
- Duplicate sections (featured, today's specials, recommended, bestsellers, chef)
- Customize sheet without quantity or live total

## After (PX6)

Screenshots: `docs/px6/food-{dark|light}-{375|390|430|768|1024|1280|1440}.png`  
Landscape: `docs/px6/food-{dark|light}-landscape-812.png`

### First viewport (375px dark)

- Compact restaurant identity strip (logo + name)
- Sticky category rail immediately below
- Signature dishes rail with hero photography (`DishPoster`)
- Category sections use borderless editorial `FoodRow`

### Interactions

- Floating glass preview bar on add (pulse on count change)
- Bottom sheet customization with storytelling panel
- Restaurant → menu subtle enter fade (`ob-food-px6--enter`)

## Capture

```bash
VITE_FF_OB_MENU=true VITE_FF_OB_RESTAURANT=true npm run dev -- --port 5180
node scripts/capture-food-px6.mjs http://localhost:5180/
```
