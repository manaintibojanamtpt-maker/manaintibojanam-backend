@echo off
cd /d f:\Manaintibojanam_final2\manaintibojanam-backend
git add src/components/marketing/MarketingHero.tsx src/components/marketing/EcosystemVisual.tsx src/components/marketing/FoodDiscoverySection.tsx src/components/marketing/CommissionComparison.tsx src/components/CallToAction.tsx src/config/marketingFoodImages.ts src/styles/marketing-cinematic.css src/marketing.css
git status --short | findstr /i "marketing FoodImage cinematic CallToAction Commission"