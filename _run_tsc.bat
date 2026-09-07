@echo off
cd /d "f:\Manaintibojanam_final2\manaintibojanam-backend"
node node_modules/typescript/bin/tsc --noEmit 2>&1
echo TSC_EXIT:%ERRORLEVEL%