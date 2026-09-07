@echo off
cd /d f:\Manaintibojanam_final2\manaintibojanam-backend
git add src/components/CallToAction.tsx
git commit -m "Fix: Remove cine-reveal from CallToAction — restore CTA section visibility"
git push origin main > _git_push_cta_fix.txt 2>&1
echo EXIT=%ERRORLEVEL% >> _git_push_cta_fix.txt