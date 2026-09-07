@echo off
cd /d f:\Manaintibojanam_final2\manaintibojanam-backend
git log --oneline -3 > _git_log.txt 2>&1
git status --short >> _git_log.txt 2>&1
echo DONE >> _git_log.txt