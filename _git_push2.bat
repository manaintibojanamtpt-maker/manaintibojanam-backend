@echo off
cd /d f:\Manaintibojanam_final2\manaintibojanam-backend
git push origin main > _git_push2.txt 2>&1
echo EXIT=%ERRORLEVEL% >> _git_push2.txt