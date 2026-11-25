@echo off
chcp 65001 >nul
cd /d "%~dp0"
title AZRAIL agent
if not defined AZRAIL_URL set "AZRAIL_URL=https://azrail-pulse.mnmllpulse.workers.dev"
set "AZRAIL_ROOT=%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Не найден Node.js. Установи его с https://nodejs.org и запусти этот файл снова.
  pause
  exit /b 1
)
git pull --ff-only >nul 2>nul
if not exist "node_modules\playwright\" (
  echo Первый запуск: ставлю зависимости, это займёт пару минут.
  call npm install
)
node scripts\local-agent\azrail-agent.mjs
if errorlevel 1 pause
