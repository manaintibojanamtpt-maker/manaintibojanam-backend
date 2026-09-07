@echo off
cd /d f:\Manaintibojanam_final2\manaintibojanam-backend
npx tsc --noEmit > _tsc_full.txt 2>&1
echo TSC_EXIT=%ERRORLEVEL% >> _tsc_full.txt