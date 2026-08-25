@echo off
cd /d %~dp0
call gradlew.bat :customer:compileDebugKotlin --no-daemon --stacktrace
