@echo off
cd /d f:\Manaintibojanam_final2\manaintibojanam-backend
git commit -m "Cinematic 3D-style marketing redesign — depth, motion, food photography

Replace the text-heavy marketing UI with a premium cinematic experience:

Hero (MarketingHero):
- Cinematic kitchen photography with Ken Burns zoom + warm photo grading
- Floating order-status cards (New Order #1042, Preparing, Ready, Out for Delivery)
- 3D-perspective OrderBhojan phone mockup rotating into position
- Glowing dashed SVG connector paths between composition layers
- Oversized headline 'Run your food business. Own your customers.' with orange emphasis
- Dual CTA: Start Your Restaurant (/onboard) + Order Food (orderbhojan.com)
- Three compact benefits: 0%% Commission, Own Your Customers, All In One

EcosystemVisual:
- Four visual stage cards: Restaurant photo -> BhojanOS dashboard mockup
  -> OrderBhojan phone UI -> Customer dining photo
- Animated orange dashed connectors with flowing nodes
- Desktop horizontal layout / mobile vertical timeline

FoodDiscoverySection:
- Portrait food cards (3:4) with restaurant, rating, price, Add+ button
- 10 verified HD Unsplash dish images across Biryani, Dosa, Paneer, Thali, etc.
- Hover: image zoom, card lift, orange glow
- Floating OrderBhojan phone + Order Food CTA

CommissionComparison:
- Animated money-flow visual: other platforms (20%% commission) vs BhojanOS (0%%)
- Rupee coin drop animation, animated arrows
- 'With BhojanOS you keep 100%% of your earnings.'

CallToAction:
- Cinematic kitchen background with warm rim lighting and layered scrims
- 'Ready to take control of your food business?' with chef composition

marketing-cinematic.css:
- New design-system layer: float, zoom, dash-flow, coin-flow, glass, shimmer
- Photo grading (cine-photo) for consistent campaign look
- All motion uses transform/opacity only (compositor-friendly)
- Progressive enhancement: fully visible without JS animation
- prefers-reduced-motion: all animation disabled

marketingFoodImages.ts:
- Added CINEMATIC_ENV_IMAGES (kitchen, chef, restaurantInterior, dining, foodTable)
- Added CINEMATIC_FOOD_CARDS (10 portrait dishes with restaurant/rating/price)
- All 15 cinematic image URLs verified HTTP 200

marketing.css: import new cinematic layer.

All new marketing components: zero TypeScript errors.
1523 pre-existing errors in backend-lib/conversation/hooks/lib-tests untouched.
CTAs wire to real flows (/onboard, https://www.orderbhojan.com)."