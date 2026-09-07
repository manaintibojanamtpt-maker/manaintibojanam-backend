@echo off
cd /d f:\Manaintibojanam_final2\manaintibojanam-backend
git add src/components/marketing/MarketingHero.tsx
git commit -m "Fix: Restore hero left content visibility — remove cine-reveal opacity:0 dependency"
git push origin main > _git_push_fix.txt 2>&1
echo EXIT=%ERRORLEVEL% >> _git_push_fix.txt