@echo off
cd /d f:\Manaintibojanam_final2\manaintibojanam-backend
git log --oneline -1
git status --short | findstr /i "marketing FoodImage cinematic CallToAction Commission"