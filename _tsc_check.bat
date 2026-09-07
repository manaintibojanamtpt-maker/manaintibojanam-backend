@echo off
cd /d f:\Manaintibojanam_final2\manaintibojanam-backend
call npx tsc --noEmit -p tsconfig.json > _tsc_out.txt 2>&1
echo TSC_EXIT=%ERRORLEVEL% >> _tsc_out.txt
