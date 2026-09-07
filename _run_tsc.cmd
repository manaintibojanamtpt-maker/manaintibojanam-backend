@echo off
cd /d "f:\Manaintibojanam_final2\manaintibojanam-backend"
node node_modules\typescript\bin\tsc --noEmit
echo TSC_EXIT_CODE:%ERRORLEVEL%
